<h1><img src="icon.svg" width="40" height="40" align="top" alt="">&nbsp;&nbsp;DOORS</h1>

**English** | [日本語](README.ja.md)

> [!IMPORTANT]
> **On a computer only.** DOORS runs in Chrome, Edge, Safari and Firefox on a desktop or laptop. It does not work on phones or tablets: it needs a large screen, files dropped from the computer, and enough memory to make the mix.

- DOORS joins audio files into one, for background music: the music played in a venue while the doors are open, before an event starts.
- Drop the tracks in. Each one is brought to the same loudness, the silence at its start and end is cut, and the tracks are crossfaded in list order into a single file.
- Listen to the result on its waveform before you download it, change the order or the crossfade, and make it again.
- With a single file it works as a converter: the file is levelled and saved as MP3, WAV, FLAC or AAC.
- Everything runs in your browser with ffmpeg.wasm. **Your files are never uploaded**, and after the first visit the app opens without a connection too.

**Open the app: https://hugesesame.github.io/doors/**

![DOORS: five tracks in the list, the settings and the finished mix with its waveform, track names and crossfades](screenshots/main.png)

## What it does

- **Drop and go**: drop audio files anywhere on the window, or press **Add Files**. Video files work too: their sound is used. Each file is analysed in turn as it comes.
- **Even loudness**: every track is brought to -16 LUFS, so no track suddenly jumps out. A quiet track is raised by 10 dB at most, so its noise is not raised with it, and a limiter keeps the peaks under -1 dBTP.
- **No gaps**: silence at the start and the end of each track is cut.
- **Crossfades** from 0 to 10 s in steps of 0.1 s (slide, or type the value), with equal-power curves so the level does not dip. Next to a short track the crossfade is shortened to half of that track. The same crossfade is used between every pair of tracks: it cannot be set track by track.
- **Drag to reorder**; × takes a file off the list. Files that cannot be used (unreadable, without sound, or silent throughout) are shown in red and left out.
- **The finished mix on a waveform**, with each track's name and the crossfades marked. Click anywhere to move the playhead there, or click a name to go to that track's start; zoom in to check a transition.
- **A player as in [Show Tracks](https://github.com/hugesesame/show-tracks)**: go to the start, back / forward 5 s, play / stop, previous / next track, with the same keys.
- **Make it again**: change the order or the settings after listening, and the finished mix stays to compare, marked *Out of date*, until **MIX** makes it again. **Discard** throws it away.
- **Output**: 44.1 kHz stereo, as MP3 320k, WAV 16-bit, FLAC or AAC 256k (.m4a).
- **Day and Night** modes, fullscreen, and a help in English and Japanese (`?`).

![DOORS in Night mode](screenshots/night.png)

## Getting started

1. Open the app on a computer, in Chrome, Edge, Safari or Firefox.
2. Drop your tracks on the window (or press **Add Files**) and wait for each to be analysed.
3. Drag the rows into the order you want, and choose the **Crossfade** and the **Format**.
4. Press **MIX** (**CONVERT** for a single file).
5. Check the mix on the waveform at the bottom: click where you want to listen and press `Space`.
6. Press **Download**.

On a recent computer, an hour of tracks takes about a minute to analyse and about 20 seconds to mix.

## Keyboard

| Key | Does |
|---|---|
| `Space` | Play / stop the finished mix (it stops where it is) |
| `Home` | Go to the start |
| `←` / `→`, `↑` / `↓` | Previous / next track |
| `⌥←` / `⌥→`, `,` / `.` | Back / forward 5 seconds |
| `=` / `-` | Zoom in / out |
| `/`, `⇧Z` | Show the whole mix |
| `F` | Fullscreen on / off |
| `?` | Help |

On the waveform, a pinch (or ⌘ / Ctrl + wheel) zooms and a sideways swipe (or Shift + wheel) scrolls.

## Your files

- The tracks are read and mixed inside this browser. Nothing is sent anywhere.
- The tracks and the mix are not kept: the list is empty when the page is opened again. Download the mix before you close the page.
- The settings (crossfade, format, Day / Night, the help's language) are remembered in this browser.

## Good to know

- **Browsers**: Chrome, Edge, Safari and Firefox on a computer. It is not made for phones or tablets.
- **Big files**: a file over 1 GB (a long WAV or FLAC) may not fit in the browser's memory; the app says so, and MP3 is the safe choice for long mixes.
- While a mix is being made, the order and the settings are locked. You can still add files: they are analysed when it is done. **Cancel** stops the mix.

## Development

```sh
npm install
npm run dev           # the app at http://localhost:5173/
npm test              # unit tests
npm run test:render   # mixes real files with the native ffmpeg (needs ffmpeg installed)
npm run build         # dist/, as published
```

- Vite and TypeScript, without a framework. `src/core/` holds the logic (analysis, planning, the ffmpeg arguments) and its tests; `src/engine/` runs ffmpeg.wasm; `src/ui/` draws the page.
- The ffmpeg.wasm core is copied from `node_modules` into `public/ffmpeg/` before `dev` and `build`, and served from the app's own site.
- Every push to `main` is tested and published to GitHub Pages.
- The screenshots are taken again with [scripts/screenshots](scripts/screenshots/README.md).

## License

[GPL-3.0-or-later](LICENSE).

DOORS includes [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm): `@ffmpeg/core` (FFmpeg compiled to WebAssembly, GPL-2.0-or-later) and `@ffmpeg/ffmpeg` (MIT).
