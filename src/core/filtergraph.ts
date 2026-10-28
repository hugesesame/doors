import { LIMIT_DB, SAMPLE_RATE, WAVE_RATE } from '../config';
import type { OutputFormat } from './formats';
import type { Plan } from './plan';

const seconds = (n: number) => String(Number(n.toFixed(6)));
const decibels = (n: number) => String(Number(n.toFixed(2)));

/**
 * The ffmpeg arguments that turn the planned tracks into one file at `output`, and the same
 * mix as raw mono 16-bit samples at WAVE_RATE at `wave`, for drawing its waveform.
 * `pathOf` gives where each track's file is mounted.
 */
export function renderArgs(
  plan: Plan,
  pathOf: (id: string) => string,
  format: OutputFormat,
  output: string,
  wave: string,
): string[] {
  const inputs = plan.tracks.flatMap((t) => ['-i', pathOf(t.id)]);

  // Each track: trimmed, in one sample rate and layout so they can be joined, then levelled.
  const graph = plan.tracks.map(
    (t, i) =>
      `[${i}:a]atrim=start=${seconds(t.start)}:end=${seconds(t.end)},asetpts=PTS-STARTPTS,` +
      `aresample=${SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${decibels(t.gainDb)}dB[a${i}]`,
  );

  // Then joined one after another: equal-power curves keep the level up through a crossfade.
  let mixed = 'a0';
  plan.joins.forEach((fade, i) => {
    const out = `x${i + 1}`;
    graph.push(
      fade > 0
        ? `[${mixed}][a${i + 1}]acrossfade=d=${seconds(fade)}:c1=qsin:c2=qsin[${out}]`
        : `[${mixed}][a${i + 1}]concat=n=2:v=0:a=1[${out}]`,
    );
    mixed = out;
  });

  // Raising a quiet track can push its peaks over full scale; the limiter catches them.
  // A small copy of the result is all the waveform needs, made in the same pass.
  const limit = (10 ** (LIMIT_DB / 20)).toFixed(4);
  graph.push(`[${mixed}]alimiter=limit=${limit}:level=disabled,asplit=2[out][w]`);
  graph.push(`[w]aformat=channel_layouts=mono,aresample=${WAVE_RATE}[wave]`);

  return [
    '-hide_banner',
    ...inputs,
    '-filter_complex',
    graph.join(';'),
    '-map',
    '[out]',
    ...format.codec,
    output,
    '-map',
    '[wave]',
    '-c:a',
    'pcm_s16le',
    '-f',
    's16le',
    wave,
  ];
}
