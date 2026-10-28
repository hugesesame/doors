const pad = (n: number) => String(n).padStart(2, '0');

/** Seconds as "03:42", or "1:02:03" from an hour on; "--:--" when the time is not known. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** An ffmpeg timestamp such as "00:01:02.50" in seconds, or null if it is not one. */
export function parseTimestamp(text: string): number | null {
  const match = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(text);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}
