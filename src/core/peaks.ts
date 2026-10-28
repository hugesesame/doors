/** The finest level keeps the loudest of this many samples; each coarser level, of four bins of the one before. */
const BASE_BIN = 16;
const LEVEL_FACTOR = 4;

/** A waveform ready to draw at any zoom: the loudest point of each bin, 0 to 255, at several bin sizes. */
export interface Peaks {
  rate: number;
  duration: number;
  /** Finest first. */
  levels: { binSize: number; max: Uint8Array }[];
}

/** From mono 16-bit samples at `rate` per second. */
export function buildPeaks(samples: Int16Array, rate: number): Peaks {
  const first = new Uint8Array(Math.ceil(samples.length / BASE_BIN));
  for (let i = 0; i < first.length; i++) {
    let max = 0;
    const end = Math.min(samples.length, (i + 1) * BASE_BIN);
    for (let s = i * BASE_BIN; s < end; s++) max = Math.max(max, Math.abs(samples[s]));
    first[i] = Math.round((max * 255) / 32768);
  }

  const levels = [{ binSize: BASE_BIN, max: first }];
  for (let prev = levels[0]; prev.max.length > 1; prev = levels[levels.length - 1]) {
    const next = new Uint8Array(Math.ceil(prev.max.length / LEVEL_FACTOR));
    for (let i = 0; i < next.length; i++) {
      let max = 0;
      const end = Math.min(prev.max.length, (i + 1) * LEVEL_FACTOR);
      for (let b = i * LEVEL_FACTOR; b < end; b++) max = Math.max(max, prev.max[b]);
      next[i] = max;
    }
    levels.push({ binSize: prev.binSize * LEVEL_FACTOR, max: next });
  }

  return { rate, duration: samples.length / rate, levels };
}

/**
 * The height (0 to 1) of each of `width` pixels from `start` seconds on, at `secondsPerPixel`:
 * the loudest point the pixel covers, read from the coarsest level still finer than a pixel.
 */
export function peaksInView(peaks: Peaks, start: number, secondsPerPixel: number, width: number): Float32Array {
  const view = new Float32Array(width);
  const samplesPerPixel = secondsPerPixel * peaks.rate;
  const level = peaks.levels.findLast((l) => l.binSize <= samplesPerPixel) ?? peaks.levels[0];
  const { binSize, max } = level;
  const total = peaks.duration * peaks.rate;

  for (let px = 0; px < width; px++) {
    const from = (start + px * secondsPerPixel) * peaks.rate;
    if (from >= total) break;
    const first = Math.floor(from / binSize);
    const last = Math.min(max.length, Math.max(first + 1, Math.ceil((from + samplesPerPixel) / binSize)));
    let loudest = 0;
    for (let b = first; b < last; b++) loudest = Math.max(loudest, max[b]);
    view[px] = loudest / 255;
  }
  return view;
}
