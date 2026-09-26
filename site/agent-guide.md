# strudel-cli agent guide

Use this CLI to check a trusted Strudel source file or inspect the events that its pattern generates. It runs without a browser or audio device.

## Install

On macOS ARM64 or Linux x64:

```sh
mise use -g github:TudorAndrei/strudel-cli@latest
```

## Workflow

1. Run `strudel describe` to get the current command schema as JSON.
2. Write a `.strudel` file whose last expression returns a pattern.
3. Run `strudel check song.strudel --json --limit 0`. Exit code 0 means the selected cycle range evaluated and queried without an error.
4. If you need events, run `strudel query song.strudel --from 0 --to 4 --limit 16`. Increase the limit only when you need more events.
5. If a command exits with code 1, read its `error` field, edit the source, and run it again.

`--from` and `--to` are nonnegative cycle numbers. The default range is 0 to 1. The end must be greater than the start. `--limit` is a nonnegative integer. The result keeps the full `eventCount` when it cuts the `events` list, and sets `truncated` to `true`.

## JSON result

For a file containing `s("bd hh")`, `strudel query song.strudel --limit 1` returns an object like this:

```json
{"valid":true,"range":[0,1],"eventCount":2,"events":[{"begin":"0","end":"1/2","value":{"s":"bd"}}],"truncated":true}
```

The `begin` and `end` fields are cycle positions as fractions. A failed JSON command writes `{"valid":false,"error":"..."}` and exits with code 1. Human-readable `check` output goes to standard output on success and standard error on failure.

## Limits

The CLI runs the file as JavaScript. Use files that you trust. A check covers only its selected cycle range. The CLI does not verify audio samples or produce sound.

## Links

- [Command schema](./command-schema.json)
- [Source code](https://github.com/TudorAndrei/strudel-cli)
- [Latest release](https://github.com/TudorAndrei/strudel-cli/releases/latest)
