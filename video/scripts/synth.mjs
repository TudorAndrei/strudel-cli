// Renders the queried Strudel events to a WAV file. strudel-cli makes no sound,
// so this synth plays the exact events that the CLI returned for soundtrack.strudel.
// It reads the Strudel controls in each event: note, s, gain, pan, cutoff, hcutoff,
// resonance, attack, release, room, and delay.
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
const stereo = () => [new Float32Array(length), new Float32Array(length)];

// Drums bypass the sidechain. Music, reverb, and echo duck under the kick.
const drums = stereo();
const music = stereo();
const reverbSend = stereo();
const delaySend = stereo();
const kicks = [];
const masterEffects = [];

const fraction = (text) => {
  const [n, d = '1'] = String(text).split('/');
  return Number(n) / Number(d);
};

const NOTE_STEPS = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function midi(note) {
  if (typeof note === 'number') return note;
  const match = /^([a-g])(#|b|s|f)?(-?\d+)$/i.exec(note);
  if (!match) throw new Error(`Unknown note: ${note}`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' || accidental === 's' ? 1 : accidental === 'b' || accidental === 'f' ? -1 : 0;
  return 12 * (Number(octave) + 1) + NOTE_STEPS[letter.toLowerCase()] + shift;
}
const frequency = (m) => 440 * 2 ** ((m - 69) / 12);

let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};

// Topology-preserving state variable filter (Simper). Mode: lp, bp, or hp.
function svf(mode) {
  let ic1 = 0;
  let ic2 = 0;
  return (x, cutoff, q = 0.707) => {
    const g = Math.tan((Math.PI * Math.min(Math.max(cutoff, 20), RATE * 0.45)) / RATE);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return mode === 'lp' ? v2 : mode === 'bp' ? v1 : x - k * v1 - v2;
  };
}

// Band-limited saw.
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}
function saw(f, phase = 0) {
  const dt = f / RATE;
  return () => {
    phase += dt;
    if (phase >= 1) phase -= 1;
    return 2 * phase - 1 - blep(phase, dt);
  };
}

// Writes one voice into a bus with Strudel pan (0 left, 0.5 center, 1 right) and effect sends.
function add(bus, start, seconds, controls, sample) {
  const first = Math.floor(start * RATE);
  const count = Math.floor(seconds * RATE);
  const angle = (controls.pan ?? 0.5) * (Math.PI / 2);
  const gl = Math.cos(angle) * Math.SQRT2;
  const gr = Math.sin(angle) * Math.SQRT2;
  const gain = controls.gain ?? 1;
  const room = controls.room ?? 0;
  const delay = controls.delay ?? 0;
  for (let i = 0; i < count && first + i < length; i++) {
    const v = sample(i / RATE) * gain;
    const j = first + i;
    bus[0][j] += v * gl;
    bus[1][j] += v * gr;
    if (room) {
      reverbSend[0][j] += v * gl * room;
      reverbSend[1][j] += v * gr * room;
    }
    if (delay) {
      delaySend[0][j] += v * gl * delay;
      delaySend[1][j] += v * gr * delay;
    }
  }
}

const envelope = (t, seconds, attack, release) => {
  const a = attack > 0 ? Math.min(1, t / attack) : Math.min(1, t / 0.003);
  return t < seconds ? a : a * Math.exp(-(t - seconds) / Math.max(release / 4, 0.01));
};

const instruments = {
  bd(start, _seconds, c) {
    kicks.push(start);
    let phase = 0;
    const hp = svf('hp');
    add(drums, start, 0.55, c, (t) => {
      phase += (2 * Math.PI * (44 + 150 * Math.exp(-t * 32))) / RATE;
      const body = Math.sin(phase) * Math.exp(-t * 5.2);
      const click = hp(noise(), 2500) * Math.exp(-t * 350) * 0.6;
      return Math.tanh((body + click) * 1.8) * 0.95;
    });
  },

  sd(start, _seconds, c) {
    const bp = svf('bp');
    const hp = svf('hp');
    add(drums, start, 0.35, { room: 0.18, ...c }, (t) => {
      const n = noise();
      // Three quick bursts before the tail give the snare a clap edge.
      const bursts = t < 0.024 ? Math.exp(-((t % 0.008) * 400)) : 1;
      const tone = (Math.sin(2 * Math.PI * 185 * t) + 0.5 * Math.sin(2 * Math.PI * 330 * t)) * Math.exp(-t * 28) * 0.45;
      const air = (bp(n, 2200, 0.9) * 1.4 + hp(n, 6000) * 0.5) * Math.exp(-t * 14) * bursts;
      return (tone + air) * 0.62;
    });
  },

  hh(start, seconds, c) {
    metal(start, 0.07, 55, 0.24, c);
  },

  oh(start, seconds, c) {
    metal(start, 0.4, 7, 0.17, c);
  },

  // Acid bass: saw and sub sine through a resonant low-pass with a snappy filter envelope.
  sawtooth(start, seconds, c) {
    const f = frequency(midi(c.note));
    const osc = saw(f);
    const lp = svf('lp');
    const cutoff = c.cutoff ?? 2000;
    const q = 0.707 + (c.resonance ?? 0) * 0.32;
    add(music, start, seconds + 0.06, c, (t) => {
      const sweep = cutoff * (0.45 + 2.2 * Math.exp(-t * 16));
      const x = osc() * 0.8 + Math.sin(2 * Math.PI * f * t) * 0.55;
      return Math.tanh(lp(x, sweep, q) * 2.2) * envelope(t, seconds, 0.002, 0.05) * 0.34;
    });
  },

  // Seven detuned saws per note, spread across the stereo field.
  supersaw(start, seconds, c) {
    const f = frequency(midi(c.note));
    const release = c.release ?? 1;
    const detune = [-0.19, -0.11, -0.05, 0, 0.05, 0.11, 0.19];
    for (const side of [0, 1]) {
      const voices = detune
        .filter((_, i) => (i === 3 ? true : (i < 3) === (side === 0)))
        .map((d) => saw(f * 2 ** (d / 12), Math.abs(noise())));
      const lp = svf('lp');
      const hp = svf('hp');
      const hcutoff = c.hcutoff ?? 0;
      add(music, start, seconds + release, { ...c, pan: side ? 0.92 : 0.08 }, (t) => {
        let v = 0;
        for (const voice of voices) v += voice();
        v = lp(v, c.cutoff ?? 3000, 0.9);
        if (hcutoff > 20) v = hp(v, hcutoff, 0.9);
        return v * envelope(t, seconds, c.attack ?? 0.01, release) * 0.05;
      });
    }
  },

  // Karplus-Strong plucked string. The cutoff sets the brightness of the pluck.
  pluck(start, seconds, c) {
    const f = frequency(midi(c.note));
    const size = Math.round(RATE / f);
    const line = new Float32Array(size);
    const bright = 1 - Math.exp((-2 * Math.PI * (c.cutoff ?? 5000)) / RATE);
    let smooth = 0;
    for (let i = 0; i < size; i++) {
      smooth += bright * (noise() - smooth);
      line[i] = smooth;
    }
    let index = 0;
    const hold = seconds + 0.9;
    add(music, start, hold, c, (t) => {
      const next = (index + 1) % size;
      const out = line[index];
      line[index] = 0.5 * (line[index] + line[next]) * 0.996;
      index = next;
      return out * Math.min(1, (hold - t) / 0.05) * 0.42;
    });
  },

  // Warm lead: two detuned triangles with delayed vibrato.
  triangle(start, seconds, c) {
    const f = frequency(midi(c.note));
    for (const [pan, cents] of [[0.3, -6], [0.7, 6]]) {
      let phase = Math.abs(noise());
      add(music, start, seconds + 0.4, { ...c, pan }, (t) => {
        const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, Math.max(0, (t - 0.15) / 0.2));
        phase = (phase + (f * 2 ** (cents / 1200) * vibrato) / RATE) % 1;
        const tri = 1 - 4 * Math.abs(phase - 0.5);
        return tri * envelope(t, seconds, 0.01, 0.4) * Math.exp(-t * 1.2) * 0.2;
      });
    }
  },

  riser(start, seconds, c) {
    for (const pan of [0.15, 0.85]) {
      const bp = svf('bp');
      let phase = 0;
      add(music, start, seconds, { room: 0.5, ...c, pan }, (t) => {
        const u = t / seconds;
        phase += (2 * Math.PI * 180 * 2 ** (u * 3.5)) / RATE;
        const hiss = bp(noise(), 350 * 2 ** (u * 5), 2.5) * 1.3;
        return (hiss + Math.sin(phase) * 0.12) * u * u * 0.5;
      });
    }
  },

  impact(start, _seconds, c) {
    let phase = 0;
    add(drums, start, 2.6, { room: 0.35, ...c }, (t) => {
      phase += (2 * Math.PI * (30 + 60 * Math.exp(-t * 4))) / RATE;
      return Math.tanh(Math.sin(phase) * Math.exp(-t * 1.6) * 1.5) * 0.85;
    });
    for (const pan of [0.1, 0.9]) {
      const hp = svf('hp');
      add(music, start, 3, { room: 0.9, ...c, pan }, (t) => hp(noise(), 2500) * Math.exp(-t * 1.4) * 0.22);
    }
  },

  glitch(start, seconds) {
    masterEffects.push({ type: 'glitch', start, seconds });
  },

  tapestop(start, seconds) {
    masterEffects.push({ type: 'tapestop', start, seconds });
  },
};

// 808 hi-hat: six square waves at inharmonic ratios, band-passed.
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
function metal(start, seconds, decay, level, c) {
  const bp = svf('bp');
  const hp = svf('hp');
  add(drums, start, seconds, { pan: 0.58, ...c }, (t) => {
    let v = 0;
    for (const f of METAL) v += (f * 1.7 * t) % 1 < 0.5 ? 1 : -1;
    return hp(bp(v, 9500, 1.2), 7000) * Math.exp(-t * decay) * level;
  });
}

for (const event of capture.timeline.events) {
  const start = fraction(event.begin) / cps;
  const seconds = (fraction(event.end) - fraction(event.begin)) / cps;
  const play = instruments[event.value.s];
  if (!play) throw new Error(`No sound for event ${JSON.stringify(event.value)}`);
  play(start, seconds, event.value);
}

// Ping-pong echo: three sixteenths, with a darker sound on each repeat.
{
  const time = Math.round((3 / 16 / cps) * RATE);
  const [left, right] = [new Float32Array(time), new Float32Array(time)];
  let dl = 0;
  let dr = 0;
  for (let i = 0; i < length; i++) {
    const k = i % time;
    const outL = left[k];
    const outR = right[k];
    dl += 0.35 * (outR - dl);
    dr += 0.35 * (outL - dr);
    left[k] = (delaySend[0][i] + delaySend[1][i]) * 0.5 + dl * 0.5;
    right[k] = dr * 0.9;
    music[0][i] += outL * 0.8;
    music[1][i] += outR * 0.8;
  }
}

// Feedback delay network reverb: eight lines, Hadamard mixing, damping in the loop.
{
  const sizes = [2203, 2477, 2729, 3001, 3271, 3547, 3821, 4093];
  const decay = 2.6;
  const lines = sizes.map((n) => new Float32Array(n));
  const gains = sizes.map((n) => 10 ** ((-3 * n) / (RATE * decay)));
  const damp = sizes.map(() => 0);
  const pos = sizes.map(() => 0);
  const pre = new Float32Array(Math.round(0.025 * RATE));
  const out = new Float32Array(8);
  for (let i = 0; i < length; i++) {
    const p = i % pre.length;
    const input = pre[p];
    pre[p] = (reverbSend[0][i] + reverbSend[1][i]) * 0.5;
    for (let l = 0; l < 8; l++) {
      damp[l] += 0.45 * (lines[l][pos[l]] - damp[l]);
      out[l] = damp[l] * gains[l];
    }
    // Fast Walsh-Hadamard transform, normalized.
    for (let h = 1; h < 8; h *= 2) {
      for (let a = 0; a < 8; a += h * 2) {
        for (let b = a; b < a + h; b++) {
          const x = out[b];
          const y = out[b + h];
          out[b] = x + y;
          out[b + h] = x - y;
        }
      }
    }
    for (let l = 0; l < 8; l++) {
      lines[l][pos[l]] = out[l] / Math.sqrt(8) + input * (l % 2 ? -0.6 : 0.6);
      pos[l] = (pos[l] + 1) % sizes[l];
    }
    music[0][i] += (damp[0] - damp[2] + damp[4] - damp[6]) * 0.55;
    music[1][i] += (damp[1] - damp[3] + damp[5] - damp[7]) * 0.55;
  }
}

// Sidechain: the kick pushes the music bus down, then it swells back.
const mix = stereo();
{
  kicks.sort((a, b) => a - b);
  let next = 0;
  let last = -Infinity;
  for (let i = 0; i < length; i++) {
    const t = i / RATE;
    while (next < kicks.length && kicks[next] <= t) last = kicks[next++];
    const since = t - last;
    const duck = 1 - 0.7 * Math.min(1, since / 0.004) * Math.exp(-since / 0.11);
    mix[0][i] = drums[0][i] + music[0][i] * duck;
    mix[1][i] = drums[1][i] + music[1][i] * duck;
  }
}

// Master effects that act on the whole mix.
for (const effect of masterEffects) {
  const first = Math.floor(effect.start * RATE);
  const count = Math.floor(effect.seconds * RATE);
  const source = mix.map((channel) => channel.slice(first, first + count));
  if (effect.type === 'glitch') {
    // Ratchet: repeat the first slice, and make the slice shorter four times.
    const slices = [1 / 16, 1 / 32, 1 / 64, 1 / 128].map((c) => Math.floor((c / cps) * RATE));
    for (let i = 0; i < count && first + i < length; i++) {
      const stage = Math.min(3, Math.floor((i / count) * 4));
      const k = i % slices[stage];
      const crush = stage === 3 ? 8 : 64;
      for (const [ch, channel] of mix.entries()) {
        channel[first + i] = Math.round(source[ch][k] * crush) / crush;
      }
    }
  } else if (effect.type === 'tapestop') {
    let read = 0;
    for (let i = 0; first + i < length; i++) {
      const u = Math.min(1, i / count);
      const whole = Math.floor(read);
      const part = read - whole;
      for (const [ch, channel] of mix.entries()) {
        const a = source[ch][whole] ?? 0;
        const b = source[ch][whole + 1] ?? 0;
        channel[first + i] = u < 1 ? (a + (b - a) * part) * (1 - u * u * u) : 0;
      }
      read += (1 - u) ** 1.6;
    }
  }
}

// Master: DC filter, bus compressor, soft clip, and normalization.
{
  const attack = Math.exp(-1 / (0.004 * RATE));
  const release = Math.exp(-1 / (0.15 * RATE));
  const threshold = 0.5;
  let env = 0;
  let hpState = [0, 0];
  let hpLast = [0, 0];
  let peak = 0;
  for (let i = 0; i < length; i++) {
    for (const ch of [0, 1]) {
      const x = mix[ch][i];
      hpState[ch] = 0.9965 * (hpState[ch] + x - hpLast[ch]);
      hpLast[ch] = x;
      mix[ch][i] = hpState[ch];
    }
    const level = Math.max(Math.abs(mix[0][i]), Math.abs(mix[1][i]));
    env = level > env ? attack * env + (1 - attack) * level : release * env + (1 - release) * level;
    const gain = env > threshold ? (threshold + (env - threshold) / 2.5) / env : 1;
    for (const ch of [0, 1]) {
      mix[ch][i] = Math.tanh(mix[ch][i] * gain * 1.1);
      peak = Math.max(peak, Math.abs(mix[ch][i]));
    }
  }
  const normalize = 0.95 / peak;
  for (const ch of [0, 1]) for (let i = 0; i < length; i++) mix[ch][i] *= normalize;
}

const samples = Buffer.alloc(length * 4);
for (let i = 0; i < length; i++) {
  samples.writeInt16LE(Math.round(mix[0][i] * 32767), i * 4);
  samples.writeInt16LE(Math.round(mix[1][i] * 32767), i * 4 + 2);
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
