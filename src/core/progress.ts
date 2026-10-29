import { parseTimestamp } from './time';

/** Below this share done, the speed so far says too little to guess the time left. */
const MIN_RATIO_FOR_ESTIMATE = 0.01;

/** How far into the output (seconds) an ffmpeg progress line says it has got, or null. */
export function timeInLine(line: string): number | null {
  const match = /time=(\S+)/.exec(line);
  return match ? parseTimestamp(match[1]) : null;
}

/** The length (seconds) of the input that an ffmpeg header line gives, or null. */
export function durationInLine(line: string): number | null {
  const match = /^\s*Duration: ([^,]+),/.exec(line);
  return match ? parseTimestamp(match[1]) : null;
}

export interface Progress {
  /** Share done, 0 to 1. */
  ratio: number;
  /** Seconds left at the speed so far; null while that cannot be told yet. */
  remaining: number | null;
}

/** `done` and `total` are seconds of output, `elapsed` the seconds spent so far. */
export function estimateProgress(done: number, total: number, elapsed: number): Progress {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  if (ratio < MIN_RATIO_FOR_ESTIMATE) return { ratio, remaining: null };
  return { ratio, remaining: (elapsed * (1 - ratio)) / ratio };
}
