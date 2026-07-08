// Tiny WebAudio synth — no audio assets needed.
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

export function setMuted(m: boolean) { muted = m; }
export function isMuted() { return muted; }
export function toggleMuted(): boolean { muted = !muted; return muted; }

function tone(freq: number, dur: number, type: OscillatorType, vol: number, glideTo?: number) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.02);
}

function noise(dur: number, vol: number, filterFreq: number, glideTo?: number) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filterFreq, a.currentTime);
  if (glideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, glideTo), a.currentTime + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  mineHit: () => noise(0.06, 0.10, 1400),
  breakRock: () => { noise(0.16, 0.22, 500); tone(110, 0.12, 'triangle', 0.12, 60); },
  pickup: () => tone(880, 0.09, 'square', 0.05, 1500),
  place: () => tone(300, 0.08, 'square', 0.08, 200),
  craft: () => { tone(600, 0.1, 'triangle', 0.1); setTimeout(() => tone(900, 0.12, 'triangle', 0.1), 70); },
  error: () => tone(140, 0.18, 'sawtooth', 0.08, 90),
  click: () => tone(500, 0.04, 'square', 0.04),
  torch: () => noise(0.25, 0.06, 900, 300),
  cartStep: () => noise(0.03, 0.03, 2500),
  fuse: () => noise(0.5, 0.05, 3500, 2000),
  boom: (tier: number) => {
    noise(0.7 + tier * 0.25, 0.4 + tier * 0.12, 900, 60);
    tone(80, 0.6 + tier * 0.2, 'sine', 0.4, 25);
  },
  deposit: () => { tone(400, 0.07, 'square', 0.06); setTimeout(() => tone(520, 0.07, 'square', 0.06), 60); },
  seal: () => { tone(200, 0.4, 'sawtooth', 0.12, 80); noise(0.5, 0.15, 400, 100); },
  win: () => { tone(60, 2.0, 'sine', 0.4, 30); noise(2.5, 0.35, 500, 40); },
  heartbeat: (v: number) => { tone(46, 0.22, 'sine', 0.16 * v, 34); setTimeout(() => tone(42, 0.28, 'sine', 0.12 * v, 30), 220); },
  page: () => { noise(0.18, 0.08, 2600, 900); setTimeout(() => noise(0.12, 0.05, 2000, 700), 90); },
  relic: () => { tone(520, 0.16, 'triangle', 0.1); setTimeout(() => tone(660, 0.16, 'triangle', 0.1), 110); setTimeout(() => tone(880, 0.3, 'triangle', 0.12), 220); },
  crateOpen: () => { noise(0.2, 0.12, 700, 250); tone(140, 0.15, 'triangle', 0.08, 90); },
  squish: () => { tone(300, 0.12, 'sine', 0.09, 120); noise(0.1, 0.05, 800); },
  rumble: () => { noise(1.6, 0.12, 220, 50); tone(38, 1.4, 'sine', 0.1, 26); },
};
