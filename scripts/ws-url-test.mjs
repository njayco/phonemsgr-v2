// Regression test: WebSocket URL scheme must match the API origin —
// ws:// for plain-HTTP development backends, wss:// for HTTPS.
// Mirrors buildWsUrl in lib/websocket.ts.
// Run: node scripts/ws-url-test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../lib/websocket.ts'), 'utf8');
const fnMatch = src.match(/export function buildWsUrl[\s\S]*?\n\}/);
if (!fnMatch) { console.log('FAIL — buildWsUrl not found in lib/websocket.ts'); process.exit(1); }
const buildWsUrl = new Function('apiBaseUrl', fnMatch[0].replace(/export function buildWsUrl\(apiBaseUrl: string\): string \{/, '').replace(/\}$/, ''));

const cases = [
  ['http://localhost:5000', 'ws://localhost:5000/ws'],
  ['http://192.168.1.20:5000/', 'ws://192.168.1.20:5000/ws'],
  ['https://myapp.replit.app', 'wss://myapp.replit.app/ws'],
  ['https://something.riker.replit.dev/', 'wss://something.riker.replit.dev/ws'],
];
let failed = 0;
for (const [input, expected] of cases) {
  const got = buildWsUrl(input);
  const ok = got === expected;
  console.log(ok ? 'PASS' : 'FAIL', '—', input, '→', got, ok ? '' : `(expected ${expected})`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
