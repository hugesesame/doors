// Mixes generated tones with the native ffmpeg, using the arguments the app builds,
// and measures the result. Skipped where ffmpeg is not installed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WAVE_RATE } from '../src/config';
import { analysisArgs, parseAnalysis } from '../src/core/analysis';
import { renderArgs } from '../src/core/filtergraph';
import { FORMATS } from '../src/core/formats';
import { makePlan } from '../src/core/plan';
import type { Analysis } from '../src/core/types';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** Runs ffmpeg and returns its log; ffmpeg logs to stderr. */
function ffmpeg(args: string[]): string {
  const run = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`ffmpeg failed:\n${run.stderr.slice(-2000)}`);
  return run.stderr;
}

function analyse(path: string): Analysis {
  const result = parseAnalysis(ffmpeg(analysisArgs(path)));
  if (!result.ok) throw new Error(`${path}: ${result.error}`);
  return result.analysis;
}

describe.skipIf(!hasFfmpeg)('render with the native ffmpeg', () => {
  let dir: string;
  const path = (name: string) => join(dir, name);
  const tone = (name: string, args: string) =>
    ffmpeg(['-hide_banner', '-y', '-f', 'lavfi', '-i', args, path(name)]);

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'bgm-mixer-render-'));
    // Quiet mono, with silence at both ends to cut off.
    tone('a.wav', 'sine=frequency=440:duration=20,volume=-4dB,adelay=1000:all=1,apad=pad_dur=2');
    // Loud stereo.
    tone('b.flac', 'sine=frequency=660:duration=15,volume=8dB,pan=stereo|c0=c0|c1=c0');
    // In between, as an MP3.
    tone('c.mp3', 'sine=frequency=550:duration=12,volume=-4dB,pan=stereo|c0=c0|c1=c0');
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('starts from tracks of quite different loudness', () => {
    const levels = ['a.wav', 'b.flac', 'c.mp3'].map((name) => analyse(path(name)).lufs);
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(10);
  });

  it('mixes them into one MP3 of the planned length at the target loudness', () => {
    const names = ['a.wav', 'b.flac', 'c.mp3'];
    const plan = makePlan(
      names.map((id) => ({ id, result: { ok: true, analysis: analyse(path(id)) } })),
      4,
    );
    ffmpeg(renderArgs(plan, path, FORMATS.mp3, path('mix.mp3'), path('wave.raw')));

    const mix = analyse(path('mix.mp3'));
    expect(Math.abs(mix.duration - plan.total)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(mix.lufs - -16)).toBeLessThanOrEqual(1);
    expect(mix.truePeak).toBeLessThanOrEqual(-1);
    expect(mix.headSilence).toBe(0);
    expect(mix.tailSilence).toBe(0);
  });

  it('writes a waveform copy as long as the mix, loudest where the loud track plays', () => {
    const names = ['a.wav', 'b.flac', 'c.mp3'];
    const plan = makePlan(
      names.map((id) => ({ id, result: { ok: true, analysis: analyse(path(id)) } })),
      4,
    );
    ffmpeg(renderArgs(plan, path, FORMATS.mp3, path('mix2.mp3'), path('wave2.raw')));

    const raw = readFileSync(path('wave2.raw'));
    const samples = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
    expect(Math.abs(samples.length / WAVE_RATE - plan.total)).toBeLessThanOrEqual(0.1);
    // Levelled, every track should reach a similar peak; nothing close to silence in the middle of one.
    const peakAt = (second: number) => {
      let max = 0;
      for (let i = second * WAVE_RATE; i < (second + 1) * WAVE_RATE; i++) max = Math.max(max, Math.abs(samples[i]));
      return max;
    };
    expect(peakAt(5)).toBeGreaterThan(1000);
    expect(peakAt(Math.floor(plan.total) - 3)).toBeGreaterThan(1000);
  });

  it('converts a single mono track to a stereo WAV at the target loudness', () => {
    const plan = makePlan([{ id: 'a.wav', result: { ok: true, analysis: analyse(path('a.wav')) } }], 4);
    ffmpeg(renderArgs(plan, path, FORMATS.wav, path('single.wav'), path('single-wave.raw')));

    const single = analyse(path('single.wav'));
    expect(Math.abs(single.duration - 20)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(single.lufs - -16)).toBeLessThanOrEqual(1);
    expect(ffmpeg(['-hide_banner', '-i', path('single.wav'), '-f', 'null', '-'])).toMatch(/Audio: pcm_s16le.*44100 Hz, stereo/);
  });
});
