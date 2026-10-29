import { describe, expect, it } from 'vitest';
import { makePlan, type PlanInput } from '../src/core/plan';
import type { Analysis } from '../src/core/types';

const analysis = (over: Partial<Analysis> = {}): Analysis => ({
  duration: 200,
  lufs: -16,
  truePeak: -3,
  headSilence: 0,
  tailSilence: 0,
  ...over,
});

const track = (id: string, over: Partial<Analysis> = {}): PlanInput => ({
  id,
  result: { ok: true, analysis: analysis(over) },
});

describe('makePlan', () => {
  it('cuts the silence off the head and the tail', () => {
    const plan = makePlan([track('a', { duration: 100, headSilence: 1.5, tailSilence: 2 })], 4);
    expect(plan.tracks[0]).toMatchObject({ id: 'a', start: 1.5, end: 98 });
  });

  it('brings each track to the target loudness', () => {
    const plan = makePlan([track('loud', { lufs: -6 }), track('quiet', { lufs: -20 })], 4);
    expect(plan.tracks.map((t) => t.gainDb)).toEqual([-10, 4]);
  });

  it('raises a quiet track by 10 dB at most', () => {
    const plan = makePlan([track('a', { lufs: -40 })], 4);
    expect(plan.tracks[0].gainDb).toBe(10);
  });

  it('lowers a loud track as far as needed', () => {
    const plan = makePlan([track('a', { lufs: 4 })], 4);
    expect(plan.tracks[0].gainDb).toBe(-20);
  });

  it('crossfades by the set length between long tracks', () => {
    const plan = makePlan([track('a'), track('b'), track('c')], 4);
    expect(plan.joins).toEqual([4, 4]);
  });

  it('shortens a crossfade to half of the shorter track next to it', () => {
    const plan = makePlan([track('a'), track('short', { duration: 5, headSilence: 1 }), track('c')], 4);
    expect(plan.joins).toEqual([2, 2]);
  });

  it('joins end to end where the crossfade would be under 0.1 s', () => {
    const plan = makePlan([track('a'), track('tiny', { duration: 0.15 }), track('c')], 4);
    expect(plan.joins).toEqual([0, 0]);
  });

  it('joins every track end to end when the crossfade is set to 0', () => {
    const plan = makePlan([track('a'), track('b')], 0);
    expect(plan.joins).toEqual([0]);
  });

  it('adds up the length the mix will have', () => {
    const plan = makePlan([track('a', { duration: 100, headSilence: 2 }), track('b', { duration: 60 })], 4);
    expect(plan.total).toBe(98 + 60 - 4);
  });

  it('leaves out tracks that failed or are not analysed yet', () => {
    const plan = makePlan(
      [track('a'), { id: 'bad', result: { ok: false, error: 'unreadable' } }, { id: 'waiting', result: null }, track('b')],
      4,
    );
    expect(plan.tracks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(plan.joins).toEqual([4]);
  });

  it('has no joins for a single track', () => {
    const plan = makePlan([track('a', { duration: 100 })], 4);
    expect(plan.joins).toEqual([]);
    expect(plan.total).toBe(100);
  });

  it('is empty without tracks', () => {
    expect(makePlan([], 4)).toEqual({ tracks: [], joins: [], loop: 0, total: 0 });
  });
});

describe('makePlan with Loop', () => {
  it('crossfades the last track back into the first by the set length', () => {
    const plan = makePlan([track('a'), track('b'), track('c')], 4, true);
    expect(plan.joins).toEqual([4, 4]);
    expect(plan.loop).toBe(4);
  });

  it('is one crossfade shorter, as the first track starts inside it', () => {
    const plan = makePlan([track('a', { duration: 100 }), track('b', { duration: 60 })], 4, true);
    expect(plan.total).toBe(100 + 60 - 4 - 4);
  });

  it('shortens the loop to half of the first or the last track', () => {
    expect(makePlan([track('short', { duration: 5 }), track('b')], 4, true).loop).toBe(2.5);
    expect(makePlan([track('a'), track('short', { duration: 3 })], 4, true).loop).toBe(1.5);
  });

  it('loops a single track into its own start', () => {
    const plan = makePlan([track('a', { duration: 100 })], 4, true);
    expect(plan.loop).toBe(4);
    expect(plan.total).toBe(96);
  });

  it('does nothing with the crossfade set to 0', () => {
    const plan = makePlan([track('a'), track('b')], 0, true);
    expect(plan.loop).toBe(0);
    expect(plan.total).toBe(400);
  });

  it('does nothing when Loop is off, or without tracks', () => {
    expect(makePlan([track('a'), track('b')], 4).loop).toBe(0);
    expect(makePlan([], 4, true)).toEqual({ tracks: [], joins: [], loop: 0, total: 0 });
  });
});
