# Promo video

A 30 second [Remotion](https://www.remotion.dev/) video for strudel-cli.

The terminal output in the video comes from the CLI. `scripts/capture.mjs` runs `strudel check`, `query`, and `describe` on the files in `patterns/` and writes `src/data/capture.json`.

The music is `patterns/soundtrack.strudel`, a 15-cycle arrangement whose sections start on the video cuts. The drop plays the `song.strudel` patterns, so the piano roll in the query scene shows what you hear. The CLI does not make sound, so `scripts/synth.mjs` renders the events from `strudel query soundtrack.strudel --from 0 --to 15` to `public/soundtrack.wav`. It reads each event's Strudel controls (`note`, `s`, `gain`, `pan`, `cutoff`, `hcutoff`, `resonance`, `attack`, `release`, `room`, `delay`). The sounds are an acid bass, a supersaw pad, Karplus-Strong plucks, 808-style hats, kick-driven sidechain, a ping-pong echo, and an FDN reverb. Three events act on the full mix: `glitch` (a ratchet stutter when the broken file fails), `gap` (the silent eighth before the drop), and `tapestop` (the end).

Build the CLI first with `npm install` in the repository root. Then, in this directory:

```sh
npm install
npm run studio   # preview
npm run render   # writes out/strudel-cli-promo.mp4
```

Set `STRUDEL_BIN` to use a standalone `strudel` executable instead of `../bin/strudel.mjs`.
