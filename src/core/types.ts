/** Why a track cannot go into the mix. */
export type TrackError = 'unreadable' | 'no-audio' | 'silent';

/** What the analysis found in one file. Times are in seconds. */
export interface Analysis {
  duration: number;
  /** Integrated loudness (LUFS). */
  lufs: number;
  /** True peak (dBTP). */
  truePeak: number;
  /** Silence at the very start, cut off in the mix. */
  headSilence: number;
  /** Silence at the very end, cut off in the mix. */
  tailSilence: number;
}

export type AnalysisResult = { ok: true; analysis: Analysis } | { ok: false; error: TrackError };
