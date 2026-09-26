// Renders the queried Strudel events to a WAV file. strudel-cli makes no sound,
// so this small synth plays the exact events that the CLI returned.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const capture = JSON.parse(readFileSync(join(root, 'src', 'data', 'capture.json'), 'utf8'));
const { cps } = capture;
const [, toCycle] = capture.timeline.range;

const RATE = 44100;
const TAIL = 1.5;
const length = Math.ceil((toCycle / cps + TAIL) * RATE);
const left = new Float32Array(length);
const right = new Float32Array(length);

const fraction = (text) => {
  const [n, d = '1'] = String(text).split('/');
  return Number(n) / Number(d);
};

const NOTE_STEPS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function midi(name) {
  const match = /^([a-g])(#|b|s|f)?(-?\d+)$/i.exec(name);
  if (!match) throw new Error(`Unknown note: ${name}`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' || accidental === 's' ? 1 : accidental === 'b' || accidental === 'f' ? -1 : 0;
  return 12 * (Number(octave) + 1) + NOTE_STEPS[letter.toLowerCase()] + shift;
}
const frequency = (m) => 440 * 2 ** ((m - 69) / 12);

let seed = 1;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};

function add(start, seconds, pan, sample) {
  const first = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  const gl = Math.cos((pan + 1) * Math.PI / 4);
  const gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < count && first + i < length; i++) {
    const v = sample(i / RATE, i);
    left[first + i] += v * gl;
    right[first + i] += v * gr;
  }
}

function kick(start) {
  let phase = 0;
  add(start, 0.45, 0, (t) => {
    phase += 2 * Math.PI * (48 + 110 * Math.exp(-t * 28)) / RATE;
    return Math.sin(phase) * Math.exp(-t * 7) * 0.95;
  });
}

function snare(start) {
  let low = 0;
  add(start, 0.25, 0.05, (t) => {
    const n = noise();
    low += 0.35 * (n - low);
    const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 30) * 0.35;
    return ((n - low) * 0.5 + body) * Math.exp(-t * 17);
  });
}

function hat(start, index) {
  let last = 0;
  add(start, 0.06, index % 2 ? 0.3 : -0.3, (t) => {
    const n = noise();
    const high = n - last;
    last = n;
    return high * Math.exp(-t * 70) * (index % 2 ? 0.1 : 0.16);
  });
}

// Band-limited saw and triangle from summed harmonics, with a simple envelope.
function tone(start, seconds, note, shape) {
  const f = frequency(midi(note));
  const harmonics = [];
  for (let k = 1; k * f < 9000 && k <= 40; k++) {
    if (shape === 'triangle' && k % 2 === 0) continue;
    const amp = shape === 'triangle' ? (((k - 1) / 2) % 2 ? -1 : 1) / (k * k) : 1 / k;
    harmonics.push([k, amp]);
  }
  const bass = shape === 'sawtooth';
  const gain = bass ? 0.16 : 0.2;
  const release = bass ? 0.05 : 0.35;
  let filtered = 0;
  add(start, seconds + release, bass ? 0 : 0.15, (t) => {
    let v = 0;
    for (const [k, amp] of harmonics) v += amp * Math.sin(2 * Math.PI * f * k * t);
    const attack = Math.min(1, t / 0.006);
    const body = bass ? Math.exp(-t * 5) * 0.7 + 0.3 : Math.exp(-t * 2.2);
    const tail = t > seconds ? Math.exp(-(t - seconds) / (release / 4)) : 1;
    // One-pole low-pass sweep gives the bass a plucked sound.
    const cutoff = bass ? 250 + 2400 * Math.exp(-t * 14) : 5000;
    filtered += (1 - Math.exp(-2 * Math.PI * cutoff / RATE)) * (v - filtered);
    return filtered * attack * body * tail * gain;
  });
}

let hatIndex = 0;
for (const event of capture.timeline.events) {
  const start = fraction(event.begin) / cps;
  const seconds = (fraction(event.end) - fraction(event.begin)) / cps;
  const { s, note } = event.value;
  if (note !== undefined) tone(start, seconds, String(note), s);
  else if (s === 'bd') kick(start);
  else if (s === 'sd') snare(start);
  else if (s === 'hh') hat(start, hatIndex++);
  else throw new Error(`No sound for event ${JSON.stringify(event.value)}`);
}

// A dotted-eighth echo on the triangle side, then soft clipping.
const delay = Math.floor(0.375 * RATE);
for (let i = delay; i < length; i++) {
  left[i] += right[i - delay] * 0.22;
  right[i] += left[i - delay] * 0.22;
}

const fadeOut = 1.2 * RATE;
const samples = Buffer.alloc(length * 4);
for (let i = 0; i < length; i++) {
  const fade = Math.min(1, (length - i) / fadeOut);
  samples.writeInt16LE(Math.round(Math.tanh(left[i] * 1.1) * fade * 32000), i * 4);
  samples.writeInt16LE(Math.round(Math.tanh(right[i] * 1.1) * fade * 32000), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + samples.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(samples.length, 40);

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'soundtrack.wav'), Buffer.concat([header, samples]));
console.log(`soundtrack: ${capture.timeline.events.length} events, ${(length / RATE).toFixed(1)} s`);
