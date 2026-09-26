import capture from './data/capture.json';
import { FPS } from './theme';

export type StrudelEvent = {
  begin: string;
  end: string;
  value: { s?: string; note?: string };
};

export type QueryResult = {
  valid: boolean;
  range: [number, number];
  eventCount: number;
  events: StrudelEvent[];
  truncated: boolean;
};

export const data = capture as unknown as {
  version: string;
  cps: number;
  files: { song: string; broken: string };
  check: { command: string; stdout: string; exitCode: number };
  broken: { command: string; stderr: string; exitCode: number };
  count: { command: string; stdout: string; exitCode: number };
  query: { command: string; result: QueryResult };
  describe: { command: string; result: Record<string, unknown> };
  timeline: QueryResult;
};

export const fraction = (text: string): number => {
  const [n, d = '1'] = text.split('/');
  return Number(n) / Number(d);
};

export const frameToCycle = (frame: number): number => (frame / FPS) * data.cps;

const kickFrames = data.timeline.events
  .filter((event) => event.value.s === 'bd' || event.value.s === 'impact')
  .map((event) => Math.round((fraction(event.begin) / data.cps) * FPS));

// 1 on a kick drum hit in the soundtrack, then decays to 0.
export const kickPulse = (frame: number): number => {
  let last = -Infinity;
  for (const kick of kickFrames) {
    if (kick > frame) break;
    last = kick;
  }
  return Math.exp(-(frame - last) / 5);
};

// Frame range of a one-off soundtrack event, such as the glitch.
export const eventFrames = (s: string): [number, number] => {
  const event = data.timeline.events.find((e) => e.value.s === s);
  if (!event) throw new Error(`No ${s} event in the soundtrack`);
  return [fraction(event.begin), fraction(event.end)].map((cycle) => Math.round((cycle / data.cps) * FPS)) as [number, number];
};

const NOTE_STEPS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export const midi = (name: string): number => {
  const match = /^([a-g])(#|b|s|f)?(-?\d+)$/i.exec(name);
  if (!match) throw new Error(`Unknown note: ${name}`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' || accidental === 's' ? 1 : accidental === 'b' || accidental === 'f' ? -1 : 0;
  return 12 * (Number(octave) + 1) + NOTE_STEPS[letter.toLowerCase()] + shift;
};

// The event text as the CLI writes it, one event per line.
export const eventJson = (event: StrudelEvent): string => JSON.stringify(event);
