# strudel-cli

Check a Strudel file and inspect its pattern events without a browser or audio device.

## Install

Requires Node.js 20 or later.

```sh
npm install
npm link
```

`npm install` builds the command. You can also run it with `node bin/strudel.mjs` without linking it.

To install the standalone command with [mise](https://mise.jdx.dev/dev-tools/backends/github.html) on macOS ARM64 or Linux x64:

```sh
mise use -g github:TudorAndrei/strudel-cli@latest
strudel --help
```

For one project, omit `-g`. The GitHub release has one archive for each supported system.

## Commands

```sh
strudel check song.strudel
strudel check song.strudel --json
strudel query song.strudel --from 0 --to 4
```

`check` evaluates the file and queries the pattern over one cycle by default. It exits with code 0 if that succeeds and code 1 if it fails. `query` writes one JSON object to standard output. Both commands accept `--from` and `--to` with nonnegative cycle numbers. The end must be greater than the start. `check --json` also writes JSON. Errors in JSON mode have `valid: false` and an `error` message.

For a file containing `s("bd hh")`, `query` returns:

```json
{"valid":true,"range":[0,1],"events":[{"begin":"0","end":"1/2","value":{"s":"bd"}},{"begin":"1/2","end":"1","value":{"s":"hh"}}]}
```

The file must return a Strudel pattern. The command includes functions from `@strudel/core`, `@strudel/mini`, and `@strudel/tonal`. It uses the Strudel transpiler, so double quoted strings use mini notation. The command runs the file as JavaScript. Run files that you trust.

The CLI checks the selected cycle range. A pattern can fail in a later range even if `check` succeeds for the default range. The command does not check audio samples or produce sound.

## Development

```sh
npm test
```

## Standalone executable

Install [Bun](https://bun.com/docs/installation), then run:

```sh
npm run build:binary
dist/strudel check song.strudel
npm run test:binary
```

The build writes `dist/strudel` for the current operating system and CPU. It includes the Bun runtime and Strudel packages, so the executable does not need Node.js, Bun, or `node_modules` when you run it. To build for another system, use Bun's `--target` option as shown in the [Bun executable guide](https://bun.com/docs/bundler/executables).

`npm run build:release` makes the macOS ARM64 and Linux x64 archives for a GitHub release. A `v*` tag runs the release workflow.
