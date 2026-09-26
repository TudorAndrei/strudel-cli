import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.mjs'],
  outfile: 'dist/cli.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  mainFields: ['module', 'main'],
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
});
