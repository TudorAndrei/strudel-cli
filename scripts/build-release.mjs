import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tag = `v${version}`;
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== tag) {
  throw new Error(`Release tag ${process.env.GITHUB_REF_NAME} does not match ${tag}.`);
}

const output = 'dist/release';
mkdirSync(output, { recursive: true });

for (const [target, platform] of [
  ['bun-darwin-arm64', 'macos-arm64'],
  ['bun-linux-x64', 'linux-x64'],
]) {
  const binary = join(output, `strudel-${platform}`);
  execFileSync('bun', ['build', '--compile', `--target=${target}`, 'src/cli.mjs', '--outfile', binary], {
    stdio: 'inherit',
  });

  const staging = mkdtempSync(join(tmpdir(), 'strudel-release-'));
  try {
    mkdirSync(join(staging, 'bin'));
    cpSync(binary, join(staging, 'bin/strudel'));
    cpSync('LICENSE', join(staging, 'LICENSE'));
    const archive = join(output, `strudel-${tag}-${platform}.tar.gz`);
    execFileSync('tar', ['-czf', archive, '-C', staging, 'bin', 'LICENSE']);
    console.log(archive);
  } finally {
    rmSync(staging, { recursive: true, force: true });
    rmSync(binary);
  }
}
