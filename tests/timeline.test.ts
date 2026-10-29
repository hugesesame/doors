import { describe, expect, it } from 'vitest';
import type { Plan } from '../src/core/plan';
import { timelineOf } from '../src/core/timeline';

const plan = (lengths: number[], joins: number[], loop = 0): Plan => ({
  tracks: lengths.map((length, i) => ({ id: `t${i}`, start: 1, end: 1 + length, gainDb: 0 })),
  joins,
  loop,
  total: lengths.reduce((a, b) => a + b, 0) - joins.reduce((a, b) => a + b, 0) - loop,
});

describe('timelineOf', () => {
  it('places each track where it starts and ends in the mix', () => {
    expect(timelineOf(plan([100, 60, 30], [4, 2])).segments).toEqual([
      { id: 't0', start: 0, end: 100 },
      { id: 't1', start: 96, end: 156 },
      { id: 't2', start: 154, end: 184 },
    ]);
  });

  it('marks where the tracks overlap', () => {
    expect(timelineOf(plan([100, 60, 30], [4, 2])).crossfades).toEqual([
      { start: 96, end: 100 },
      { start: 154, end: 156 },
    ]);
  });

  it('has no overlap where tracks are joined end to end', () => {
    const timeline = timelineOf(plan([10, 10], [0]));
    expect(timeline.segments.map((s) => s.start)).toEqual([0, 10]);
    expect(timeline.crossfades).toEqual([]);
  });

  it('with Loop, starts the first track inside its crossfade and ends with its head under the last', () => {
    const timeline = timelineOf(plan([100, 60], [4], 3));
    expect(timeline.segments).toEqual([
      { id: 't0', start: 0, end: 97 },
      { id: 't1', start: 93, end: 153 },
      { id: 't0', start: 150, end: 153 },
    ]);
    expect(timeline.crossfades).toEqual([
      { start: 93, end: 97 },
      { start: 150, end: 153 },
    ]);
  });

  it('loops a single track into its own head', () => {
    const timeline = timelineOf(plan([100], [], 4));
    expect(timeline.segments).toEqual([
      { id: 't0', start: 0, end: 96 },
      { id: 't0', start: 92, end: 96 },
    ]);
    expect(timeline.crossfades).toEqual([{ start: 92, end: 96 }]);
  });

  it('is empty without tracks', () => {
    expect(timelineOf(plan([], []))).toEqual({ segments: [], crossfades: [] });
  });
});
