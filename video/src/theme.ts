import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

// Same palette as the GitHub Pages site (site/styles.css).
export const color = {
  paper: '#f4f7fb',
  white: '#ffffff',
  ink: '#142b42',
  muted: '#4c6478',
  line: '#cfdae5',
  blue: '#155ac4',
  bluePale: '#dce9fc',
  orange: '#df6a38',
  night: '#14273b',
  nightLine: '#334b63',
  nightText: '#e7f1ff',
  nightMuted: '#a6bdd4',
  codeFn: '#78b8ff',
  codeString: '#ffb28b',
  green: '#6fd39a',
};

export const font = {
  sans: loadInter('normal', { weights: ['500', '700', '800'], subsets: ['latin'] }).fontFamily,
  mono: loadMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily,
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TRANSITION = 15;

// Scene lengths in frames. Transitions overlap by TRANSITION frames, so the video is
// 900 frames long: 30 seconds, which is 15 Strudel cycles at 0.5 cycles per second.
// patterns/soundtrack.strudel starts its sections on these cuts: the drop is at
// cycle 7 (frame 420, the query scene) and the outro hit is at cycle 13 (frame 780).
export const SCENES = {
  intro: 90,
  code: 165,
  check: 210,
  query: 225,
  agents: 165,
  outro: 120,
} as const;

export const sceneStart = (name: keyof typeof SCENES): number => {
  let start = 0;
  for (const [key, length] of Object.entries(SCENES)) {
    if (key === name) return start;
    start += length - TRANSITION;
  }
  throw new Error(`Unknown scene: ${name}`);
};

export const DURATION = sceneStart('outro') + SCENES.outro;
