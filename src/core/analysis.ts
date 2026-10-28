import { SILENCE_DB, SILENCE_MIN_SEC, TARGET_LUFS } from '../config';
import { parseTimestamp } from './time';
import type { AnalysisResult } from './types';

/** Silence starting or ending this close (seconds) to the edge of the track counts as touching it. */
const EDGE_SEC = 0.01;

/**
 * One pass over the file that writes nothing: silencedetect logs the silences and
 * loudnorm (measuring only, its output is thrown away) logs the loudness and the peak.
 */
export function analysisArgs(input: string): string[] {
  return [
    '-hide_banner',
    '-i',
    input,
    '-vn',
    '-af',
    `silencedetect=n=${SILENCE_DB}dB:d=${SILENCE_MIN_SEC},loudnorm=I=${TARGET_LUFS}:TP=-1.5:print_format=json`,
    '-f',
    'null',
    '-',
  ];
}

/** Reads the log of `analysisArgs`. */
export function parseAnalysis(log: string): AnalysisResult {
  if (/Error opening input/.test(log)) return { ok: false, error: 'unreadable' };
  if (/does not contain any stream/.test(log)) return { ok: false, error: 'no-audio' };

  const lufs = jsonNumber(log, 'input_i');
  const truePeak = jsonNumber(log, 'input_tp');
  const duration = lastTime(log);
  if (lufs === null || truePeak === null || duration === null) return { ok: false, error: 'unreadable' };
  if (lufs === -Infinity) return { ok: false, error: 'silent' };

  const silences = readSilences(log, duration);
  const head = silences.find((s) => s.start <= EDGE_SEC);
  const last = silences.at(-1);
  const headSilence = head ? head.end : 0;
  const tailSilence = last && last.end >= duration - EDGE_SEC ? duration - last.start : 0;
  if (headSilence >= duration - EDGE_SEC) return { ok: false, error: 'silent' };

  return { ok: true, analysis: { duration, lufs, truePeak, headSilence, tailSilence } };
}

/** A value from loudnorm's JSON; "-inf" comes back as -Infinity. */
function jsonNumber(log: string, key: string): number | null {
  const match = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(log);
  if (!match) return null;
  if (match[1] === '-inf') return -Infinity;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** The length actually decoded: the last progress line, which MP3 headers cannot get wrong. */
function lastTime(log: string): number | null {
  const times = [...log.matchAll(/time=(\S+)/g)];
  return times.length ? parseTimestamp(times[times.length - 1][1]) : null;
}

/** The silences in order; one still open at the end of the log runs to the end of the track. */
function readSilences(log: string, duration: number): { start: number; end: number }[] {
  const silences: { start: number; end: number }[] = [];
  for (const line of log.split(/\r\n|\r|\n/)) {
    const start = /silence_start: (-?[\d.]+)/.exec(line);
    if (start) silences.push({ start: Math.max(0, Number(start[1])), end: duration });
    const end = /silence_end: ([\d.]+)/.exec(line);
    if (end && silences.length) silences[silences.length - 1].end = Number(end[1]);
  }
  return silences;
}
