import { describe, expect, it } from 'vitest';
import { isHandheld } from '../src/ui/handheld';

/** A stand-in for window.matchMedia that answers from a list of queries that match. */
const media = (matching: string[]) => (query: string) => ({ matches: matching.includes(query) });

describe('isHandheld', () => {
  it('spots a phone or tablet: touch only, no mouse', () => {
    expect(isHandheld(media(['(hover: none) and (pointer: coarse)']))).toBe(true);
  });

  it('spots a screen too narrow for the app', () => {
    expect(isHandheld(media(['(max-width: 759px)']))).toBe(true);
  });

  it('leaves a computer alone, touch screen or not', () => {
    expect(isHandheld(media([]))).toBe(false);
  });
});
