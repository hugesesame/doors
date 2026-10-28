import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analysisArgs, parseAnalysis } from '../src/core/analysis';

const fixture = (name: string) => readFileSync(join(import.meta.dirname, 'fixtures', `${name}.log`), 'utf8');

describe('analysisArgs', () => {
  it('measures loudness and silence without writing anything', () => {
    expect(analysisArgs('/in/a.mp3')).toEqual([
      '-hide_banner',
      '-i',
      '/in/a.mp3',
      '-vn',
      '-af',
      'silencedetect=n=-50dB:d=0.5,loudnorm=I=-16:TP=-1.5:print_format=json',
      '-f',
      'null',
      '-',
    ]);
  });
});

describe('parseAnalysis', () => {
  it('reads the length, loudness and peak of a plain track', () => {
    expect(parseAnalysis(fixture('native-tone'))).toEqual({
      ok: true,
      analysis: { duration: 10, lufs: -31.75, truePeak: -28.06, headSilence: 0, tailSilence: 0 },
    });
  });

  it('finds the silence at the head and the tail', () => {
    const result = parseAnalysis(fixture('native-padded'));
    if (!result.ok) throw new Error('expected a track');
    expect(result.analysis.duration).toBe(11);
    expect(result.analysis.headSilence).toBeCloseTo(2.000113, 6);
    expect(result.analysis.tailSilence).toBeCloseTo(3.000091, 6);
  });

  it('takes silence still running at the end as the tail when ffmpeg does not close it', () => {
    // Older ffmpeg builds, such as the one in ffmpeg.wasm, may leave out the last silence_end.
    const log = fixture('native-padded').replace(/^.*silence_end: 11 .*$/m, '');
    const result = parseAnalysis(log);
    if (!result.ok) throw new Error('expected a track');
    expect(result.analysis.tailSilence).toBeCloseTo(3.000091, 6);
  });

  it('turns down a track that is silent throughout', () => {
    expect(parseAnalysis(fixture('native-silent'))).toEqual({ ok: false, error: 'silent' });
  });

  it('turns down a file without sound', () => {
    expect(parseAnalysis(fixture('native-video-only'))).toEqual({ ok: false, error: 'no-audio' });
  });

  it('turns down a file ffmpeg cannot read', () => {
    expect(parseAnalysis(fixture('native-broken'))).toEqual({ ok: false, error: 'unreadable' });
  });

  it('treats a log without a measurement as unreadable', () => {
    expect(parseAnalysis('')).toEqual({ ok: false, error: 'unreadable' });
  });
});
