import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };
import core from './node_modules/@ffmpeg/core/package.json' with { type: 'json' };

/** The ffmpeg core, copied into public/ by scripts/copy-ffmpeg.mjs, so not part of the bundle. */
const FFMPEG_FILES = ['ffmpeg/ffmpeg-core.js', 'ffmpeg/ffmpeg-core.wasm'];

/**
 * Writes dist/sw.js (from src/sw.js) with the list of the built files and the ffmpeg core.
 * The version follows the list and the core's version, so publishing a change replaces the saved copy.
 */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = [...Object.keys(bundle).filter((file) => file !== 'index.html'), ...FFMPEG_FILES].sort();
      const version = createHash('sha256')
        .update(`${files.join('\n')}\n${core.version}`)
        .digest('hex')
        .slice(0, 12);
      const source = readFileSync('src/sw.js', 'utf8')
        .replaceAll('__VERSION__', version)
        .replaceAll('__FILES__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  // The version lives in package.json only; the footer shows it.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [serviceWorker()],
  // @ffmpeg/ffmpeg starts its own worker from a URL next to its module; pre-bundling would break that URL.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg'] },
  worker: {
    format: 'es',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // The render test needs a native ffmpeg; it runs on its own with `npm run test:render`.
    exclude: ['tests/render.test.ts'],
    environment: 'node',
  },
});
