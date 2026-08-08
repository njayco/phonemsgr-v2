// Direct to Talk integration test — drives real WebSocket clients against
// the running backend (Start Backend workflow on port 5000).
//
// Covers: session-cookie auth (anonymous + spoofed identities rejected),
// join/invite, channel acquisition ack, single-speaker contention,
// speaker-only audio relay, prompt release, and disconnect cleanup.
//
// Run: node scripts/dtt-integration-test.mjs
import WebSocket from 'ws';

const BASE = process.env.DTT_TEST_BASE || 'http://localhost:5000';
const WSURL = BASE.replace(/^http/, 'ws') + '/ws';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(username) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'demo1234' }),
  });
  if (!res.ok) throw new Error(`login failed for ${username}`);
  return { cookie: res.headers.get('set-cookie').split(';')[0], user: await res.json() };
}

function connect(cookie) {
  return new Promise((resolve) => {
    const ws = new WebSocket(WSURL, cookie ? { headers: { cookie } } : {});
    const result = { ws, events: [], closedCode: null, connectedAs: null };
    ws.on('close', (code) => { result.closedCode = code; resolve(result); });
    ws.on('error', () => {});
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      if (m.type === 'connected') { result.connectedAs = m.userId; resolve(result); return; }
      m.at = Date.now();
      result.events.push(m);
    });
    setTimeout(() => resolve(result), 3000);
  });
}

const a = await login('alexchen');
const b = await login('barbaraw');
const c = await login('miastardust');
const { threadId } = await (await fetch(`${BASE}/api/threads`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: a.cookie },
  body: JSON.stringify({ participantId: b.user.id }),
})).json();

// Auth hardening
const anon = await connect(null);
const spoof = await connect(c.cookie);
spoof.ws.send(JSON.stringify({ type: 'auth', userId: b.user.id })); // ignored by server
await sleep(150);
spoof.ws.send(JSON.stringify({ type: 'dtt_join', threadId })); // not a participant
await sleep(300);

// Happy path
const A = await connect(a.cookie);
const B = await connect(b.cookie);
A.ws.send(JSON.stringify({ type: 'dtt_join', threadId }));
await sleep(200);
B.ws.send(JSON.stringify({ type: 'dtt_join', threadId }));
await sleep(200);

// A presses TALK; recording starts only after the server grants the channel
A.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId }));
await sleep(200);
// B contends while A holds the channel
B.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId }));
await sleep(150);
// A transmits (as granted speaker); B attempts a rogue frame
A.ws.send(JSON.stringify({ type: 'dtt_audio', threadId, seq: 0, data: 'data:audio/mp4;base64,RELAYME' }));
B.ws.send(JSON.stringify({ type: 'dtt_audio', threadId, seq: 0, data: 'data:audio/mp4;base64,ROGUE' }));
await sleep(300);
// A releases — must reach B promptly
const releasedAt = Date.now();
A.ws.send(JSON.stringify({ type: 'dtt_talk_end', threadId }));
await sleep(300);
// Now B can acquire, then disconnects abruptly mid-hold
B.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId }));
await sleep(200);
B.ws.close();
await sleep(400);

// B rejoins on a fresh socket for the remaining scenarios
const B2 = await connect(b.cookie);
B2.ws.send(JSON.stringify({ type: 'dtt_join', threadId }));
await sleep(250);

// Drain window: a released speaker's final in-flight segment (encoded after
// release) must still be relayed — but not after someone else acquires.
A.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId }));
await sleep(150);
A.ws.send(JSON.stringify({ type: 'dtt_talk_end', threadId })); // sub-segment press: release BEFORE audio is ready
await sleep(100);
A.ws.send(JSON.stringify({ type: 'dtt_audio', threadId, seq: 1, data: 'data:audio/wav;base64,TAILSEG' }));
await sleep(200);
B2.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId })); // B acquires — drain over
await sleep(150);
A.ws.send(JSON.stringify({ type: 'dtt_audio', threadId, seq: 2, data: 'data:audio/wav;base64,LATETAIL' }));
B2.ws.send(JSON.stringify({ type: 'dtt_talk_end', threadId }));
await sleep(250);

// Multi-socket: same user opens a second socket; the DTT-bound socket dying
// must release membership/speaker even though another socket stays online.
const Aextra = await connect(a.cookie); // extra non-DTT socket for user A
A.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId }));
await sleep(150);
A.ws.terminate(); // DTT-bound socket dies abruptly
await sleep(400);
const multiSocketReleased =
  B2.events.some((e) => e.type === 'dtt_talk_end' && e.userId === a.user.id) &&
  B2.events.some((e) => e.type === 'dtt_peer_left' && e.userId === a.user.id);
Aextra.ws.close();
await sleep(200);

// Reconnect resilience: A's socket already dropped above (server removed
// DTT membership); A reconnects and rejoins — exactly what the client does
// on its 'connected' event — and must be able to talk again.
const A2 = await connect(a.cookie);
A2.ws.send(JSON.stringify({ type: 'dtt_join', threadId }));
await sleep(250);
A2.ws.send(JSON.stringify({ type: 'dtt_talk_start', threadId }));
await sleep(250);
A2.ws.close();
await sleep(200);

const aT = A.events.map((e) => e.type);
const bT = B.events.map((e) => e.type);
const bEnd = B.events.find((e) => e.type === 'dtt_talk_end');
const checks = [
  ['anonymous WS rejected (4401)', anon.closedCode === 4401 && !anon.connectedAs],
  ['spoofed auth ignored — identity from session', spoof.connectedAs === c.user.id],
  ['non-participant gets no session state or audio', !spoof.events.some((e) => e.type === 'dtt_state' || e.type === 'dtt_audio')],
  ['peer invited on activation', bT.includes('dtt_invite')],
  ['speaker receives explicit grant ack', aT.includes('dtt_talk_granted')],
  ['both sides see talk_start', aT.includes('dtt_talk_start') && bT.includes('dtt_talk_start')],
  ['contender denied while channel held', bT.includes('dtt_denied')],
  ['granted speaker audio relayed to peer', B.events.some((e) => e.type === 'dtt_audio' && e.data.includes('RELAYME'))],
  ['rogue non-speaker audio NOT relayed', !A.events.some((e) => e.type === 'dtt_audio')],
  ['release relayed promptly (<200ms)', !!bEnd && bEnd.at - releasedAt < 200],
  ['peer can acquire after release', B.events.some((e) => e.type === 'dtt_talk_granted')],
  ['abrupt disconnect releases channel + notifies peer', aT.filter((t) => t === 'dtt_talk_end').length >= 2 && aT.includes('dtt_peer_left')],
  ['rejoin after reconnect gets session state', A2.events.some((e) => e.type === 'dtt_state')],
  ['rejoined user can acquire the channel again', A2.events.some((e) => e.type === 'dtt_talk_granted')],
  ['final in-flight segment relayed during drain window', B2.events.some((e) => e.type === 'dtt_audio' && e.data.includes('TAILSEG'))],
  ['drain frames dropped once another speaker acquires', !B2.events.some((e) => e.type === 'dtt_audio' && e.data.includes('LATETAIL'))],
  ['dying DTT-bound socket releases channel despite other live sockets', multiSocketReleased],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(ok ? 'PASS' : 'FAIL', '—', name);
  if (!ok) failed++;
}
try { A.ws.close(); spoof.ws.close(); } catch {}
console.log(failed === 0 ? '\nAll Direct to Talk integration checks passed.' : `\n${failed} check(s) failed.`);
// Give close frames time to flush so we don't leave zombie sockets behind
await sleep(500);
process.exit(failed ? 1 : 0);
