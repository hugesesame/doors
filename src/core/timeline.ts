import type { Plan } from './plan';

/** Where a track plays in the finished mix (seconds from its start). */
export interface Segment {
  id: string;
  start: number;
  end: number;
}

export interface Timeline {
  segments: Segment[];
  /** Where one track fades into the next. */
  crossfades: { start: number; end: number }[];
}

/**
 * Lays the planned tracks out on the mix's own clock: each starts as the one before begins to fade.
 * With Loop the first track starts that far in, and its head comes back at the end under the last track.
 */
export function timelineOf(plan: Plan): Timeline {
  const segments: Segment[] = [];
  const crossfades: Timeline['crossfades'] = [];
  let at = 0;
  plan.tracks.forEach((track, i) => {
    const length = track.end - track.start - (i === 0 ? plan.loop : 0);
    segments.push({ id: track.id, start: at, end: at + length });
    const fade = plan.joins[i] ?? plan.loop;
    if (fade > 0) crossfades.push({ start: at + length - fade, end: at + length });
    at += length - fade;
  });
  if (plan.loop > 0) segments.push({ id: plan.tracks[0].id, start: at, end: at + plan.loop });
  return { segments, crossfades };
}
