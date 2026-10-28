import { defineConfig } from 'vitest/config';

// Mixes real files with the native ffmpeg, so it is slower and kept out of `npm test`.
export default defineConfig({
  test: {
    include: ['tests/render.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
