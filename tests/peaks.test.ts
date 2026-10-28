import { describe, expect, it } from 'vitest';
import { buildPeaks, peaksInView } from '../src/core/peaks';

/** `n` samples of `value`. */
const run = (n: number, value: number) => new Array<number>(n).fill(value);

describe('buildPeaks', () => {
  it('keeps the loudest sample of every 16, as 0 to 255', () => {
    const samples = Int16Array.from([...run(15, 0), 16384, ...run(16, -32768), ...run(16, 0)]);
    const peaks = buildPeaks(samples, 2000);
    expect(peaks.levels[0].binSize).toBe(16);
    expect([...peaks.levels[0].max]).toEqual([128, 255, 0]);
  });

  it('adds coarser levels, four bins at a time', () => {
    const samples = Int16Array.from([...run(16 * 5, 0), ...run(16, 32767), ...run(16 * 10, 0)]);
    const peaks = buildPeaks(samples, 2000);
    expect(peaks.levels.map((l) => l.binSize)).toEqual([16, 64, 256]);
    expect([...peaks.levels[1].max]).toEqual([0, 255, 0, 0]);
    expect([...peaks.levels[2].max]).toEqual([255]);
  });

  it('knows how long the sound is', () => {
    expect(buildPeaks(new Int16Array(5000), 2000).duration).toBe(2.5);
  });
});

describe('peaksInView', () => {
  // 10 s at 2048 samples/s (so seconds fall on bin edges): silent, with full scale from 4 s to 5 s.
  const samples = new Int16Array(20480);
  samples.fill(32767, 8192, 10240);
  const peaks = buildPeaks(samples, 2048);

  it('gives each pixel the loudest point it covers', () => {
    // One second per pixel: only the fifth pixel (4 s to 5 s) is loud.
    expect([...peaksInView(peaks, 0, 1, 10)]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
  });

  it('starts the view anywhere', () => {
    expect([...peaksInView(peaks, 3, 1, 3)]).toEqual([0, 1, 0]);
  });

  it('shows nothing past the end', () => {
    expect([...peaksInView(peaks, 9, 1, 3)]).toEqual([0, 0, 0]);
  });

  it('spreads one bin over several pixels when zoomed right in', () => {
    // 1 ms per pixel: a 16-sample bin (8 ms) covers eight pixels.
    const view = peaksInView(peaks, 4, 0.001, 20);
    expect(view.every((v) => v === 1)).toBe(true);
  });
});
