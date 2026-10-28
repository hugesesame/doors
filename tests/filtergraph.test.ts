import { describe, expect, it } from 'vitest';
import { renderArgs } from '../src/core/filtergraph';
import { FORMATS, estimateBytes } from '../src/core/formats';
import type { Plan } from '../src/core/plan';

const path = (id: string) => `/in/${id}`;
const prep = (input: number, start: string, end: string, gain: string) =>
  `[${input}:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aresample=44100,` +
  `aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${gain}dB[a${input}]`;
const LIMIT = 'alimiter=limit=0.7943:level=disabled,asplit=2[out][w];[w]aformat=channel_layouts=mono,aresample=2000[wave]';

/** The value after an option in an argument list. */
const option = (args: string[], name: string) => args[args.indexOf(name) + 1];

describe('renderArgs', () => {
  it('passes a single track through the limiter, and writes a mono copy for the waveform', () => {
    const plan: Plan = { tracks: [{ id: 'a', start: 1.5, end: 98, gainDb: -2.345 }], joins: [], total: 96.5 };
    const args = renderArgs(plan, path, FORMATS.mp3, '/out/mix.mp3', '/out/wave.raw');
    expect(args.slice(0, 3)).toEqual(['-hide_banner', '-i', '/in/a']);
    expect(option(args, '-filter_complex')).toBe([prep(0, '1.5', '98', '-2.35'), `[a0]${LIMIT}`].join(';'));
    expect(option(args, '-map')).toBe('[out]');
    expect(args.slice(args.indexOf('/out/mix.mp3'))).toEqual([
      '/out/mix.mp3',
      '-map',
      '[wave]',
      '-c:a',
      'pcm_s16le',
      '-f',
      's16le',
      '/out/wave.raw',
    ]);
  });

  it('crossfades two tracks with equal-power curves', () => {
    const plan: Plan = {
      tracks: [
        { id: 'a', start: 0, end: 100, gainDb: 0 },
        { id: 'b', start: 0.25, end: 60, gainDb: 3 },
      ],
      joins: [4],
      total: 155.75,
    };
    const args = renderArgs(plan, path, FORMATS.mp3, '/out/mix.mp3', '/out/wave.raw');
    expect(args.filter((_, i) => args[i - 1] === '-i')).toEqual(['/in/a', '/in/b']);
    expect(option(args, '-filter_complex')).toBe(
      [
        prep(0, '0', '100', '0'),
        prep(1, '0.25', '60', '3'),
        '[a0][a1]acrossfade=d=4:c1=qsin:c2=qsin[x1]',
        `[x1]${LIMIT}`,
      ].join(';'),
    );
  });

  it('joins end to end where the plan has no crossfade', () => {
    const plan: Plan = {
      tracks: [
        { id: 'a', start: 0, end: 10, gainDb: 0 },
        { id: 'b', start: 0, end: 10, gainDb: 0 },
        { id: 'c', start: 0, end: 10, gainDb: 0 },
      ],
      joins: [0, 2.5],
      total: 27.5,
    };
    const graph = option(renderArgs(plan, path, FORMATS.mp3, '/out/mix.mp3', '/out/wave.raw'), '-filter_complex').split(';');
    expect(graph.slice(3)).toEqual([
      '[a0][a1]concat=n=2:v=0:a=1[x1]',
      '[x1][a2]acrossfade=d=2.5:c1=qsin:c2=qsin[x2]',
      ...`[x2]${LIMIT}`.split(';'),
    ]);
  });

  it('encodes with the codec of each format', () => {
    const plan: Plan = { tracks: [{ id: 'a', start: 0, end: 10, gainDb: 0 }], joins: [], total: 10 };
    const codec = (id: keyof typeof FORMATS) => {
      const output = `/out/mix.${FORMATS[id].ext}`;
      const args = renderArgs(plan, path, FORMATS[id], output, '/out/wave.raw');
      return args.slice(args.indexOf('[out]') + 1, args.indexOf(output));
    };
    expect(codec('mp3')).toEqual(['-c:a', 'libmp3lame', '-b:a', '320k']);
    expect(codec('wav')).toEqual(['-c:a', 'pcm_s16le']);
    expect(codec('flac')).toEqual(['-c:a', 'flac']);
    expect(codec('aac')).toEqual(['-c:a', 'aac', '-b:a', '256k']);
  });
});

describe('FORMATS', () => {
  it('names the file type of each format', () => {
    expect(Object.values(FORMATS).map((f) => [f.id, f.ext, f.mime])).toEqual([
      ['mp3', 'mp3', 'audio/mpeg'],
      ['wav', 'wav', 'audio/wav'],
      ['flac', 'flac', 'audio/flac'],
      ['aac', 'm4a', 'audio/mp4'],
    ]);
  });
});

describe('estimateBytes', () => {
  it('sizes constant-rate formats exactly', () => {
    expect(estimateBytes(FORMATS.mp3, 3600)).toBe(144_000_000);
    expect(estimateBytes(FORMATS.wav, 3600)).toBe(635_040_000);
  });

  it('sizes FLAC at about 60 % of WAV', () => {
    expect(estimateBytes(FORMATS.flac, 3600)).toBe(381_024_000);
  });
});
