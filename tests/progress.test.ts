import { describe, expect, it } from 'vitest';
import { estimateProgress, timeInLine } from '../src/core/progress';

describe('timeInLine', () => {
  it('reads how far ffmpeg has got from a progress line', () => {
    expect(timeInLine('size=    1024KiB time=00:01:30.50 bitrate= 320.0kbits/s speed=25x')).toBe(90.5);
  });

  it('ignores lines without a time', () => {
    expect(timeInLine('[out#0/mp3 @ 0x1] video:0KiB audio:3750KiB')).toBeNull();
    expect(timeInLine('size=N/A time=N/A bitrate=N/A')).toBeNull();
  });
});

describe('estimateProgress', () => {
  it('gives the share done and the time left at the speed so far', () => {
    expect(estimateProgress(300, 1200, 10)).toEqual({ ratio: 0.25, remaining: 30 });
  });

  it('does not guess the time left before there is anything to go on', () => {
    expect(estimateProgress(0, 1200, 3)).toEqual({ ratio: 0, remaining: null });
    expect(estimateProgress(6, 1200, 1)).toEqual({ ratio: 0.005, remaining: null });
  });

  it('stays between 0 and 1', () => {
    expect(estimateProgress(1300, 1200, 40)).toEqual({ ratio: 1, remaining: 0 });
  });
});
