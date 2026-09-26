# Promo video

A 30 second [Remotion](https://www.remotion.dev/) video for strudel-cli.

The terminal output in the video comes from the CLI. `scripts/capture.mjs` runs `strudel check`, `query`, and `describe` on the files in `patterns/` and writes `src/data/capture.json`. `scripts/synth.mjs` renders the events from `strudel query song.strudel --from 0 --to 15` to `public/soundtrack.wav`. The CLI does not make sound, so this small synth plays the queried events.

Build the CLI first with `npm install` in the repository root. Then, in this directory:

```sh
npm install
npm run studio   # preview
npm run render   # writes out/strudel-cli-promo.mp4
```

Set `STRUDEL_BIN` to use a standalone `strudel` executable instead of `../bin/strudel.mjs`.
