import { describe, expect, it } from 'vitest';
import { nextStart, previousStart } from '../src/core/markers';

const starts = [0, 96, 154];

describe('previousStart', () => {
  it('goes back to the start of the track playing', () => {
    expect(previousStart(starts, 120)).toBe(96);
  });

  it('goes to the track before when already at a start', () => {
    expect(previousStart(starts, 96)).toBe(0);
    // A hair past the start still counts as at it, so pressing twice moves on.
    expect(previousStart(starts, 96.02)).toBe(0);
  });

  it('stays at 0 at the start of the mix', () => {
    expect(previousStart(starts, 0)).toBe(0);
  });
});

describe('nextStart', () => {
  it('goes to the start of the next track', () => {
    expect(nextStart(starts, 10)).toBe(96);
    expect(nextStart(starts, 96)).toBe(154);
  });

  it('has nowhere to go in the last track', () => {
    expect(nextStart(starts, 160)).toBeNull();
  });
});
