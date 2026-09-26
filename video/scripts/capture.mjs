// Runs the real strudel CLI and stores its output for the video.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = process.env.STRUDEL_BIN
  ? [process.env.STRUDEL_BIN]
  : [process.execPath, join(root, '..', 'bin', 'strudel.mjs')];

// Strudel plays 0.5 cycles per second by default. 15 cycles fill the 30 second video.
const CPS = 0.5;
const SOUNDTRACK_CYCLES = 15;

function run(args) {
  const result = spawnSync(cli[0], [...cli.slice(1), ...args], { cwd: join(root, 'patterns'), encoding: 'utf8' });
  if (result.error) throw result.error;
  return { command: `strudel ${args.join(' ')}`, stdout: result.stdout.trim(), stderr: result.stderr.trim(), exitCode: result.status };
}

function expect(step, exitCode) {
  if (step.exitCode !== exitCode) {
    throw new Error(`${step.command} exited with ${step.exitCode}, expected ${exitCode}\n${step.stderr}`);
  }
  return step;
}

const check = expect(run(['check', 'song.strudel']), 0);
const broken = expect(run(['check', 'broken.strudel']), 1);
const count = expect(run(['check', 'song.strudel', '--json', '--limit', '0']), 0);
const query = expect(run(['query', 'song.strudel', '--from', '0', '--to', '2']), 0);
const describe = expect(run(['describe']), 0);
const timeline = expect(run(['query', 'song.strudel', '--from', '0', '--to', String(SOUNDTRACK_CYCLES)]), 0);

const capture = {
  version: JSON.parse(readFileSync(join(root, '..', 'package.json'), 'utf8')).version,
  cps: CPS,
  files: {
    song: readFileSync(join(root, 'patterns', 'song.strudel'), 'utf8').trimEnd(),
    broken: readFileSync(join(root, 'patterns', 'broken.strudel'), 'utf8').trimEnd(),
  },
  check,
  broken,
  count,
  query: { command: query.command, result: JSON.parse(query.stdout) },
  describe: { command: describe.command, result: JSON.parse(describe.stdout) },
  timeline: JSON.parse(timeline.stdout),
};

mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'capture.json'), JSON.stringify(capture, null, 2) + '\n');
console.log(`captured: ${check.stdout}; query ${capture.query.result.eventCount} events; timeline ${capture.timeline.eventCount} events`);
