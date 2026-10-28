import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: './',
  // The version lives in package.json only; the footer shows it.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
