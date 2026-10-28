import { describe, expect, it } from 'vitest';
import { formatDuration, parseTimestamp } from '../src/core/time';

describe('formatDuration', () => {
  it('shows minutes and seconds under an hour', () => {
    expect(formatDuration(222)).toBe('03:42');
    expect(formatDuration(0)).toBe('00:00');
  });

  it('adds hours from an hour on', () => {
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(36000)).toBe('10:00:00');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(59.6)).toBe('01:00');
    expect(formatDuration(59.4)).toBe('00:59');
  });

  it('shows dashes for a time that is not known', () => {
    expect(formatDuration(Number.NaN)).toBe('--:--');
    expect(formatDuration(-1)).toBe('--:--');
  });
});

describe('parseTimestamp', () => {
  it('reads ffmpeg timestamps', () => {
    expect(parseTimestamp('00:01:02.50')).toBe(62.5);
    expect(parseTimestamp('01:00:00.00')).toBe(3600);
  });

  it('returns null for anything else', () => {
    expect(parseTimestamp('N/A')).toBeNull();
    expect(parseTimestamp('')).toBeNull();
  });
});
