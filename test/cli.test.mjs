import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'strudel-cli-'));
const cli = fileURLToPath(new URL('../bin/strudel.mjs', import.meta.url));

function run(source, args = ['query']) {
  const file = join(dir, 'song.strudel');
  writeFileSync(file, source);
  return spawnSync(process.execPath, [cli, args[0], file, ...args.slice(1)], { encoding: 'utf8' });
}

test('query returns ordered Strudel events as JSON', () => {
  const result = run('s("bd hh")', ['query', '--from', '0', '--to', '2', '--json']);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.range, [0, 2]);
  assert.equal(output.valid, true);
  assert.equal(output.eventCount, 4);
  assert.equal(output.truncated, false);
  assert.deepEqual(output.events.map(({ begin, end, value }) => [begin, end, value.s]), [
    ['0', '1/2', 'bd'],
    ['1/2', '1', 'hh'],
    ['1', '3/2', 'bd'],
    ['3/2', '2', 'hh'],
  ]);
});

test('describe exposes command inputs and JSON output without a file', () => {
  const result = spawnSync(process.execPath, [cli, 'describe'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.schemaVersion, 1);
  assert.equal(output.commands.query.required.file, 'Path to a Strudel source file.');
  assert.equal(output.exitCodes.failure, 1);
});

test('query limits events and reports the full count', () => {
  const result = run('s("bd hh")', ['query', '--from', '0', '--to', '2', '--limit', '1']);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.eventCount, 4);
  assert.equal(output.events.length, 1);
  assert.equal(output.truncated, true);
});

test('check can return only the event count', () => {
  const result = run('s("bd hh")', ['check', '--json', '--limit', '0']);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.eventCount, 2);
  assert.deepEqual(output.events, []);
  assert.equal(output.truncated, true);
});

test('query returns the part span of a continuous pattern', () => {
  const result = run('sine');
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.events.map(({ begin, end }) => [begin, end]), [['0', '1']]);
});

test('check accepts a valid tonal pattern', () => {
  const result = run('note("c3 e3").s("sawtooth")', ['check']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^OK: 2 events/);
});

test('check reports a syntax error with a failure exit code', () => {
  const result = run('s("bd"', ['check', '--json']);
  assert.equal(result.status, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.valid, false);
  assert.equal(typeof output.error, 'string');
});

test('query reports errors during pattern evaluation', () => {
  const result = run('unknownFunction("bd")');
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).valid, false);
});

test('query rejects an invalid cycle range', () => {
  const result = run('s("bd")', ['query', '--from', '2', '--to', '1']);
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).error, /greater/);
});
