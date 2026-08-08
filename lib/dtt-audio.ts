import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Radio tone that plays on activation and at the start of every transmission
// (both for the speaker and the listener).
const RADIO_TONE = require('@/assets/sounds/radio-tone.wav');

let toneSound: Audio.Sound | null = null;

async function ensurePlaybackMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  } catch {}
}

export async function playRadioTone() {
  try {
    if (!toneSound) {
      const { sound } = await Audio.Sound.createAsync(RADIO_TONE, { volume: 0.9 });
      toneSound = sound;
    }
    await toneSound.replayAsync();
  } catch {}
}

export async function unloadRadioTone() {
  try {
    await toneSound?.unloadAsync();
  } catch {}
  toneSound = null;
}

export async function requestMicPermission(): Promise<boolean> {
  try {
    const res = await Audio.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

// Encode an AudioBuffer as 16-bit PCM WAV — the one format every supported
// peer (iOS, Android, all browsers) can play. Used on web because browser
// MediaRecorder output (often webm/opus) is not playable on iPhones.
function audioBufferToWavDataUri(buffer: AudioBuffer): string {
  const numCh = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const dataLen = samples.length * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(ab);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return `data:audio/wav;base64,${btoa(bin)}`;
}

async function uriToDataUri(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    // Transcode whatever the browser recorded (typically webm/opus) into
    // mono 16kHz WAV so iPhone/native peers can always play it.
    const arrayBuf = await blob.arrayBuffer();
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    try {
      const decoded = await ctx.decodeAudioData(arrayBuf);
      const targetRate = 16000;
      const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
      const offline = new OfflineAudioContext(1, frames, targetRate);
      const src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start();
      const rendered = await offline.startRendering();
      return audioBufferToWavDataUri(rendered);
    } finally {
      ctx.close().catch(() => {});
    }
  }
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  // Native recording is forced to AAC in an MP4/M4A container (see
  // DTT_RECORDING_OPTIONS) so browsers and both native platforms can play it.
  return `data:audio/mp4;base64,${base64}`;
}

function preferredWebMime(): string {
  try {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) {
      // AAC/MP4 plays everywhere, including iOS peers
      return 'audio/mp4';
    }
  } catch {}
  return 'audio/webm';
}

// Cross-platform interoperable recording: AAC in M4A on native (playable by
// browsers, iOS and Android) and audio/mp4 on web when the browser can
// record it, falling back to webm/opus.
const DTT_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: preferredWebMime(),
    bitsPerSecond: 64000,
  },
};

/**
 * Records the microphone in short back-to-back segments and hands each
 * segment (as a data URI) to onSegment. This gives near-real-time,
 * half-duplex voice over the existing WebSocket without WebRTC.
 */
export class SegmentRecorder {
  private running = false;
  private recording: Audio.Recording | null = null;
  private loopPromise: Promise<void> | null = null;

  constructor(
    private onSegment: (dataUri: string) => void,
    private segmentMs = 900,
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    this.loopPromise = this.loop();
  }

  private async loop() {
    while (this.running) {
      let uri: string | null = null;
      try {
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(DTT_RECORDING_OPTIONS);
        this.recording = recording;
        await recording.startAsync();
        const startedAt = Date.now();
        while (this.running && Date.now() - startedAt < this.segmentMs) {
          await new Promise((r) => setTimeout(r, 50));
        }
        await recording.stopAndUnloadAsync();
        this.recording = null;
        uri = recording.getURI();
      } catch {
        this.recording = null;
        // Recorder failed (e.g. permission revoked mid-stream) — stop the loop
        this.running = false;
        break;
      }
      if (uri && !this.discardTail) {
        try {
          const dataUri = await uriToDataUri(uri);
          // The final partial segment (recorded before release) IS emitted —
          // otherwise a press shorter than one segment would be silent. The
          // server accepts it inside a short post-release drain window.
          if (!this.discardTail) this.onSegment(dataUri);
        } catch {}
      }
    }
    await ensurePlaybackMode();
  }

  // When true, the in-flight final segment is dropped instead of emitted
  // (used when ending/leaving the session rather than releasing TALK).
  discardTail = false;

  async stop(): Promise<void> {
    if (!this.running && !this.recording) return;
    this.running = false;
    try {
      await this.loopPromise;
    } catch {}
    if (this.recording) {
      try { await this.recording.stopAndUnloadAsync(); } catch {}
      this.recording = null;
    }
    await ensurePlaybackMode();
  }
}

/**
 * Plays incoming audio segments strictly in order, one after another.
 */
export class PlaybackQueue {
  private queue: string[] = [];
  private playing = false;
  private stopped = false;
  private current: Audio.Sound | null = null;

  enqueue(dataUri: string) {
    if (this.stopped) return;
    // Backpressure: if playback falls behind, drop the oldest segments
    // rather than buffering unbounded base64 audio in memory.
    if (this.queue.length >= 12) this.queue.shift();
    this.queue.push(dataUri);
    if (!this.playing) this.playNext();
  }

  private async playNext() {
    const next = this.queue.shift();
    if (!next || this.stopped) {
      this.playing = false;
      return;
    }
    this.playing = true;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: next }, { shouldPlay: true });
      this.current = sound;
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded || status.didJustFinish) resolve();
          if (status.isLoaded === false) resolve();
        });
        // Safety valve in case status updates never fire
        setTimeout(resolve, 15000);
      });
      await sound.unloadAsync().catch(() => {});
      this.current = null;
    } catch {}
    this.playNext();
  }

  clear() {
    this.queue = [];
  }

  async destroy() {
    this.stopped = true;
    this.queue = [];
    if (this.current) {
      try { await this.current.unloadAsync(); } catch {}
      this.current = null;
    }
  }
}
