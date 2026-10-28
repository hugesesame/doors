import type { Engine } from '../app/app';
import { analyzeFile } from './analyzer';
import { Ffmpeg } from './ffmpeg';
import { render } from './renderer';

/** The app's engine: one ffmpeg.wasm for both analysing and rendering. */
export function createEngine(): Engine {
  const ffmpeg = new Ffmpeg();
  return {
    load: async () => {
      await ffmpeg.load();
    },
    analyze: (file) => analyzeFile(ffmpeg, file),
    render: (plan, files, format, onProgress) => render(ffmpeg, plan, files, format, onProgress),
    stop: () => ffmpeg.stop(),
  };
}
