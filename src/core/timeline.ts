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

/** Lays the planned tracks out on the mix's own clock: each starts as the one before begins to fade. */
export function timelineOf(plan: Plan): Timeline {
  const segments: Segment[] = [];
  const crossfades: Timeline['crossfades'] = [];
  let at = 0;
  plan.tracks.forEach((track, i) => {
    const length = track.end - track.start;
    segments.push({ id: track.id, start: at, end: at + length });
    const fade = plan.joins[i] ?? 0;
    if (fade > 0) crossfades.push({ start: at + length - fade, end: at + length });
    at += length - fade;
  });
  return { segments, crossfades };
}
