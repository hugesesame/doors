import { MAX_GAIN_DB, MIN_CROSSFADE_SEC, TARGET_LUFS } from '../config';
import type { AnalysisResult } from './types';

/** A track in list order; `result` is null while it is still being analysed. */
export interface PlanInput {
  id: string;
  result: AnalysisResult | null;
}

/** The part of a track that goes into the mix (seconds into the file) and how much to turn it up or down. */
export interface PlannedTrack {
  id: string;
  start: number;
  end: number;
  gainDb: number;
}

export interface Plan {
  tracks: PlannedTrack[];
  /** The crossfade (seconds) between each track and the next; 0 joins them end to end. */
  joins: number[];
  /** The length of the finished mix (seconds). */
  total: number;
}

/** Works out the mix from the analysed tracks in their list order and the crossfade setting (seconds). */
export function makePlan(inputs: readonly PlanInput[], crossfade: number): Plan {
  const tracks: PlannedTrack[] = [];
  for (const { id, result } of inputs) {
    if (!result?.ok) continue;
    const { duration, lufs, headSilence, tailSilence } = result.analysis;
    tracks.push({
      id,
      start: headSilence,
      end: duration - tailSilence,
      gainDb: Math.min(TARGET_LUFS - lufs, MAX_GAIN_DB),
    });
  }

  const length = (t: PlannedTrack) => t.end - t.start;
  // Half of each neighbour at most, so the crossfades at both ends of a track never overlap.
  const joins = tracks.slice(1).map((next, i) => {
    const fade = Math.min(crossfade, length(tracks[i]) / 2, length(next) / 2);
    return fade < MIN_CROSSFADE_SEC ? 0 : fade;
  });

  const total = tracks.reduce((sum, t) => sum + length(t), 0) - joins.reduce((sum, j) => sum + j, 0);
  return { tracks, joins, total };
}
