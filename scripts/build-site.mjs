import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = new URL('../dist/site/', import.meta.url);
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(new URL('../site/', import.meta.url), output, { recursive: true });

const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/strudel.mjs', import.meta.url)), 'describe'], {
  encoding: 'utf8',
});
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
const schema = JSON.parse(result.stdout);
writeFileSync(new URL('command-schema.json', output), `${JSON.stringify(schema, null, 2)}\n`);
