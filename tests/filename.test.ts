import { describe, expect, it } from 'vitest';
import { outputName } from '../src/core/filename';
import { FORMATS } from '../src/core/formats';

const at = new Date(2026, 9, 28, 9, 5);

describe('outputName', () => {
  it('names a mix by the date and time it was made', () => {
    expect(outputName(['a.wav', 'b.mp3'], FORMATS.mp3, at)).toBe('mix-20261028-0905.mp3');
  });

  it('keeps the name of a single track and changes its extension', () => {
    expect(outputName(['Opening Theme.flac'], FORMATS.mp3, at)).toBe('Opening Theme.mp3');
    expect(outputName(['live.set.wav'], FORMATS.aac, at)).toBe('live.set.m4a');
  });

  it('adds the extension to a single track without one', () => {
    expect(outputName(['recording'], FORMATS.wav, at)).toBe('recording.wav');
    expect(outputName(['.hidden'], FORMATS.wav, at)).toBe('.hidden.wav');
  });
});
