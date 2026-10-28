# README screenshots

Retakes `screenshots/main.png` (Day mode) and `night.png` (Night mode) from five sample tracks, so they can be redone the same way after the screen changes.

- `make-media.mjs`: makes the sample tracks into `media/` (not kept in the repo): pink noise and a low tone pulsing like a beat, at uneven levels as real files are. Needs ffmpeg.
- `shoot.mjs`: opens the app in Chrome with a fresh profile, adds the tracks, sets a 3 s crossfade so the crossfades show, mixes, puts the playhead part way in and takes both screenshots. Uses Playwright (the project's, or a global install).

```sh
npm run dev                               # in another terminal
node scripts/screenshots/make-media.mjs   # once
node scripts/screenshots/shoot.mjs        # or pass another URL
```
