/** Within this (seconds) of a track's start, the playhead counts as at it. */
const AT_START = 0.05;

/** Where |◀ goes: the start of the track playing, or of the one before when already at a start. */
export function previousStart(starts: readonly number[], now: number): number {
  return [...starts].reverse().find((start) => start < now - AT_START) ?? 0;
}

/** Where ▶| goes: the start of the next track, or null in the last one. */
export function nextStart(starts: readonly number[], now: number): number | null {
  return starts.find((start) => start > now + AT_START) ?? null;
}
