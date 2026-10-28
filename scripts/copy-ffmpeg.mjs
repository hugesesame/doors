// Copies the ffmpeg.wasm core into public/ffmpeg/ so the app loads it from its own site,
// on the dev server and in the build alike. Runs before `npm run dev` and `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The ESM build: the worker @ffmpeg/ffmpeg starts is a module and imports the core.
const files = ['@ffmpeg/core', '@ffmpeg/core/wasm'].map((name) => fileURLToPath(import.meta.resolve(name)));
const target = join(import.meta.dirname, '..', 'public', 'ffmpeg');

mkdirSync(target, { recursive: true });
for (const file of files) copyFileSync(file, join(target, basename(file)));
