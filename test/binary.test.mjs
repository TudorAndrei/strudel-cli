import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const binary = fileURLToPath(new URL('../dist/strudel', import.meta.url));
const file = join(mkdtempSync(join(tmpdir(), 'strudel-bin-')), 'song.strudel');

test('standalone executable checks and queries a pattern', () => {
  writeFileSync(file, 's("bd hh")');
  const check = spawnSync(binary, ['check', file], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /^OK: 2 events/);

  const query = spawnSync(binary, ['query', file], { encoding: 'utf8' });
  assert.equal(query.status, 0, query.stderr);
  assert.deepEqual(JSON.parse(query.stdout).events.map((event) => event.value.s), ['bd', 'hh']);

  const limited = spawnSync(binary, ['query', file, '--limit', '1'], { encoding: 'utf8' });
  assert.equal(limited.status, 0, limited.stderr);
  assert.equal(JSON.parse(limited.stdout).eventCount, 2);
  assert.equal(JSON.parse(limited.stdout).events.length, 1);

  const describe = spawnSync(binary, ['describe'], { encoding: 'utf8' });
  assert.equal(describe.status, 0, describe.stderr);
  assert.equal(JSON.parse(describe.stdout).schemaVersion, 1);
});

test('standalone executable exits with failure for invalid source', () => {
  writeFileSync(file, 's("bd"');
  const result = spawnSync(binary, ['check', file, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).valid, false);
});
