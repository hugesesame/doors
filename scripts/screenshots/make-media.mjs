// Makes the sample tracks for the README screenshots into media/ (not kept in the repo).
// Pink noise and a low tone, pulsing like a beat, fading in and out, at different levels,
// so the waveform and the loudness column look like real music. Needs ffmpeg.
//   node scripts/screenshots/make-media.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const media = join(dirname(fileURLToPath(import.meta.url)), 'media');
mkdirSync(media, { recursive: true });

/** [file, seconds, tone (Hz), beats per second, level (dB)] */
const TRACKS = [
  // Levels give about -22, -27, -17, -25 and -20 LUFS: as uneven as real files, all within the 10 dB the app raises at most.
  ['Morning Lobby.mp3', 52, 110, 1.6, 3],
  ['Soft Arrivals.wav', 44, 147, 1.2, -2],
  ['Golden Hour.flac', 58, 98, 2.0, 7],
  ['Doors Open.mp3', 40, 131, 1.8, 0],
  ['Last Call.m4a', 50, 123, 1.4, 5],
];

for (const [file, seconds, tone, beat, level] of TRACKS) {
  const graph =
    `[0][1]amix=inputs=2:weights=1 0.6,tremolo=f=${beat}:d=0.7,` +
    `afade=t=in:d=4,afade=t=out:st=${seconds - 5}:d=5,volume=${level}dB,pan=stereo|c0=c0|c1=c0`;
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `anoisesrc=color=pink:amplitude=0.5:duration=${seconds}:seed=${tone}`,
    '-f', 'lavfi', '-i', `sine=frequency=${tone}:duration=${seconds}`,
    '-filter_complex', graph,
    join(media, file),
  ]);
  console.log(file);
}
