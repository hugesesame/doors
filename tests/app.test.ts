import { describe, expect, it, vi } from 'vitest';
import { App, type Engine, type SettingsStore } from '../src/app/app';
import type { Plan } from '../src/core/plan';
import type { Progress } from '../src/core/progress';
import type { AnalysisResult } from '../src/core/types';

/** A promise the test settles when it wants to. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const ok = (duration = 100, lufs = -16): AnalysisResult => ({
  ok: true,
  analysis: { duration, lufs, truePeak: -3, headSilence: 0, tailSilence: 0 },
});

/** An engine whose analyses and renders finish only when the test says so. */
function fakeEngine() {
  const analyses: { file: File; job: ReturnType<typeof deferred<AnalysisResult>> }[] = [];
  const renders: {
    plan: Plan;
    onProgress: (p: Progress) => void;
    job: ReturnType<typeof deferred<{ file: Blob; wave: Int16Array }>>;
  }[] = [];
  const load = deferred<void>();
  const engine: Engine = {
    load: vi.fn(() => load.promise),
    analyze: vi.fn((file: File) => {
      const job = deferred<AnalysisResult>();
      analyses.push({ file, job });
      return job.promise;
    }),
    render: vi.fn((plan: Plan, _files, _format, onProgress) => {
      const job = deferred<{ file: Blob; wave: Int16Array }>();
      renders.push({ plan, onProgress, job });
      return job.promise;
    }),
    stop: vi.fn(),
  };
  return { engine, analyses, renders, load };
}

function memoryStore(saved: Partial<{ crossfade: number; format: string }> = {}) {
  const store: SettingsStore & { saved: unknown } = {
    saved,
    load: () => saved as never,
    save: (settings) => {
      store.saved = settings;
    },
  };
  return store;
}

const file = (name: string) => new File(['x'], name);
/** Lets pending promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function readyApp(saved = {}) {
  const fake = fakeEngine();
  const store = memoryStore(saved);
  const app = new App(fake.engine, store, () => new Date(2026, 9, 28, 9, 5));
  fake.load.resolve();
  await app.start();
  return { app, store, ...fake };
}

describe('App: tracks', () => {
  it('analyses added files one at a time, in order', async () => {
    const { app, analyses } = await readyApp();
    app.addFiles([file('a.mp3'), file('b.mp3')]);
    await settle();
    expect(analyses.map((a) => a.file.name)).toEqual(['a.mp3']);

    analyses[0].job.resolve(ok());
    await settle();
    expect(analyses.map((a) => a.file.name)).toEqual(['a.mp3', 'b.mp3']);
    expect(app.tracks.map((t) => t.result)).toEqual([ok(), null]);
  });

  it('reorders and removes tracks', async () => {
    const { app } = await readyApp();
    app.addFiles([file('a'), file('b'), file('c')]);
    const [a, b, c] = app.tracks.map((t) => t.id);
    app.move(2, 0);
    expect(app.tracks.map((t) => t.id)).toEqual([c, a, b]);
    app.remove(a);
    expect(app.tracks.map((t) => t.id)).toEqual([c, b]);
  });

  it('drops the result of a track removed while it was being analysed', async () => {
    const { app, analyses } = await readyApp();
    app.addFiles([file('a'), file('b')]);
    await settle();
    app.remove(app.tracks[0].id);
    analyses[0].job.resolve(ok());
    await settle();
    expect(app.tracks.map((t) => t.file.name)).toEqual(['b']);
    expect(analyses.map((a) => a.file.name)).toEqual(['a', 'b']);
  });

  it('tells listeners about each change', async () => {
    const { app, analyses } = await readyApp();
    const listener = vi.fn();
    app.onChange(listener);
    app.addFiles([file('a')]);
    expect(listener).toHaveBeenCalledTimes(1);
    analyses[0].job.resolve(ok());
    await settle();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('plans the mix from the analysed tracks', async () => {
    const { app, analyses } = await readyApp();
    app.addFiles([file('a'), file('b')]);
    await settle();
    analyses[0].job.resolve(ok(100));
    await settle();
    analyses[1].job.resolve(ok(60));
    await settle();
    expect(app.plan.total).toBe(100 + 60 - 2);
  });
});

describe('App: when MIX can be pressed', () => {
  it('waits until every track is analysed', async () => {
    const { app, analyses } = await readyApp();
    expect(app.canMix).toBe(false);
    app.addFiles([file('a'), file('b')]);
    await settle();
    analyses[0].job.resolve(ok());
    await settle();
    expect(app.canMix).toBe(false);
    analyses[1].job.resolve(ok());
    await settle();
    expect(app.canMix).toBe(true);
  });

  it('needs at least one track that can go into the mix', async () => {
    const { app, analyses } = await readyApp();
    app.addFiles([file('a')]);
    await settle();
    analyses[0].job.resolve({ ok: false, error: 'unreadable' });
    await settle();
    expect(app.canMix).toBe(false);
  });
});

describe('App: a single track', () => {
  it('counts only the tracks that can go into the mix', async () => {
    const { app, analyses } = await readyApp();
    app.addFiles([file('a'), file('broken')]);
    expect(app.single).toBe(false);
    await settle();
    analyses[0].job.resolve(ok());
    await settle();
    analyses[1].job.resolve({ ok: false, error: 'unreadable' });
    await settle();
    expect(app.single).toBe(true);
  });
});

describe('App: settings', () => {
  it('starts from the saved settings', async () => {
    const { app } = await readyApp({ crossfade: 7, format: 'flac' });
    expect(app.settings).toEqual({ crossfade: 7, format: 'flac' });
  });

  it('falls back to the defaults for missing or broken values', async () => {
    const { app } = await readyApp({ crossfade: 99, format: 'ogg' });
    expect(app.settings).toEqual({ crossfade: 2, format: 'mp3' });
  });

  it('takes the crossfade in tenths of a second', async () => {
    const { app } = await readyApp({ crossfade: 2.3 });
    expect(app.settings.crossfade).toBe(2.3);
    // 0.1 + 0.2 is 0.30000000000000004 in floating point; the setting comes out as 0.3.
    app.setCrossfade(0.1 + 0.2);
    expect(app.settings.crossfade).toBe(0.3);
  });

  it('rounds a typed crossfade to a tenth and keeps it between 0 and 10 s', async () => {
    const { app } = await readyApp();
    app.setCrossfade(2.37);
    expect(app.settings.crossfade).toBe(2.4);
    app.setCrossfade(12);
    expect(app.settings.crossfade).toBe(10);
    app.setCrossfade(-1);
    expect(app.settings.crossfade).toBe(0);
  });

  it('ignores a typed crossfade that is not a number', async () => {
    const { app } = await readyApp({ crossfade: 3 });
    app.setCrossfade(Number.NaN);
    expect(app.settings.crossfade).toBe(3);
  });

  it('rounds a saved crossfade to a tenth', async () => {
    const { app } = await readyApp({ crossfade: 2.34 });
    expect(app.settings.crossfade).toBe(2.3);
  });

  it('saves a change', async () => {
    const { app, store } = await readyApp();
    app.setCrossfade(6);
    app.setFormat('wav');
    expect(store.saved).toEqual({ crossfade: 6, format: 'wav' });
  });

  it('warns when the output would pass 1 GB', async () => {
    const { app, analyses } = await readyApp();
    app.addFiles([file('a')]);
    await settle();
    analyses[0].job.resolve(ok(2 * 3600));
    await settle();
    expect(app.tooBig).toBe(false);
    app.setFormat('wav');
    expect(app.tooBig).toBe(true);
  });
});

describe('App: mixing', () => {
  async function analysed(names = ['a.mp3', 'b.mp3']) {
    const ready = await readyApp();
    ready.app.addFiles(names.map(file));
    for (let i = 0; i < names.length; i++) {
      await settle();
      ready.analyses[i].job.resolve(ok());
    }
    await settle();
    return ready;
  }

  it('renders the plan and offers the file under its name', async () => {
    const { app, renders } = await analysed();
    app.mix();
    expect(app.mixState.kind).toBe('rendering');
    renders[0].onProgress({ ratio: 0.5, remaining: 10 });
    expect(app.mixState).toEqual({ kind: 'rendering', progress: { ratio: 0.5, remaining: 10 } });

    const blob = new Blob(['mix']);
    renders[0].job.resolve({ file: blob, wave: new Int16Array(2000 * 198) });
    await settle();
    expect(app.mixState).toMatchObject({ kind: 'done', name: 'mix-20261028-0905.mp3' });
    expect(app.mixState.kind === 'done' && app.mixState.blob).toBe(blob);
  });

  it('keeps the waveform and where each track plays in the mix', async () => {
    const { app, renders } = await analysed();
    const [a, b] = app.tracks.map((t) => t.id);
    app.mix();
    renders[0].job.resolve({ file: new Blob(['mix']), wave: new Int16Array(2000 * 198) });
    await settle();
    const state = app.mixState;
    if (state.kind !== 'done') throw new Error('expected a finished mix');
    expect(state.peaks.duration).toBe(198);
    expect(state.timeline.segments).toEqual([
      { id: a, name: 'a.mp3', start: 0, end: 100 },
      { id: b, name: 'b.mp3', start: 98, end: 198 },
    ]);
    expect(state.timeline.crossfades).toEqual([{ start: 98, end: 100 }]);
  });

  it('names a single track after its file', async () => {
    const { app, renders } = await analysed(['Opening.flac']);
    app.mix();
    renders[0].job.resolve({ file: new Blob(['x']), wave: new Int16Array(0) });
    await settle();
    expect(app.mixState).toMatchObject({ kind: 'done', name: 'Opening.mp3' });
  });

  it('locks the list and the settings while rendering', async () => {
    const { app } = await analysed();
    const ids = app.tracks.map((t) => t.id);
    app.mix();
    app.move(1, 0);
    app.remove(ids[0]);
    app.setCrossfade(8);
    app.setFormat('wav');
    expect(app.tracks.map((t) => t.id)).toEqual(ids);
    expect(app.settings).toEqual({ crossfade: 2, format: 'mp3' });
    expect(app.canMix).toBe(false);
  });

  it('takes files while rendering but analyses them afterwards', async () => {
    const { app, analyses, renders } = await analysed();
    app.mix();
    app.addFiles([file('late.mp3')]);
    await settle();
    expect(analyses).toHaveLength(2);
    renders[0].job.resolve({ file: new Blob(['x']), wave: new Int16Array(0) });
    await settle();
    expect(analyses.map((a) => a.file.name)).toEqual(['a.mp3', 'b.mp3', 'late.mp3']);
  });

  it('stops on cancel and goes back to waiting', async () => {
    const { app, engine, renders } = await analysed();
    app.mix();
    app.cancel();
    expect(engine.stop).toHaveBeenCalled();
    renders[0].job.reject(new Error('called FFmpeg.terminate()'));
    await settle();
    expect(app.mixState).toEqual({ kind: 'idle' });
  });

  it('keeps the end of the log when the render fails', async () => {
    const { app, renders } = await analysed();
    app.mix();
    renders[0].job.reject(Object.assign(new Error('ffmpeg could not make the file'), { logTail: 'last lines' }));
    await settle();
    expect(app.mixState).toEqual({ kind: 'failed', logTail: 'last lines' });
  });

  async function mixed() {
    const ready = await analysed();
    ready.app.mix();
    ready.renders[0].job.resolve({ file: new Blob(['x']), wave: new Int16Array(0) });
    await settle();
    return ready;
  }

  it('keeps a finished mix when the settings change, so it can still be heard, but says it is out of date', async () => {
    const { app } = await mixed();
    expect(app.mixOutdated).toBe(false);
    app.setCrossfade(8);
    expect(app.mixState.kind).toBe('done');
    expect(app.mixOutdated).toBe(true);
  });

  it('is up to date again when the settings go back', async () => {
    const { app } = await mixed();
    app.setCrossfade(8);
    app.setCrossfade(2);
    expect(app.mixOutdated).toBe(false);
  });

  it('counts a new order or a removed track as out of date too', async () => {
    const { app } = await mixed();
    app.move(1, 0);
    expect(app.mixOutdated).toBe(true);
    app.move(1, 0);
    app.remove(app.tracks[0].id);
    expect(app.mixOutdated).toBe(true);
  });

  it('can be mixed again, replacing the finished mix', async () => {
    const { app, renders } = await mixed();
    app.setCrossfade(8);
    expect(app.canMix).toBe(true);
    app.mix();
    expect(renders[1].plan.joins).toEqual([8]);
    renders[1].job.resolve({ file: new Blob(['y']), wave: new Int16Array(0) });
    await settle();
    expect(app.mixOutdated).toBe(false);
  });

  it('discards a finished mix', async () => {
    const { app } = await mixed();
    app.discard();
    expect(app.mixState).toEqual({ kind: 'idle' });
  });

  it('clears a failed mix once the list or the settings change', async () => {
    const { app, renders } = await analysed();
    app.mix();
    renders[0].job.reject(new Error('broken'));
    await settle();
    app.setCrossfade(2);
    expect(app.mixState).toEqual({ kind: 'idle' });
  });
});

describe('App: loading ffmpeg', () => {
  it('reports when ffmpeg cannot be loaded and tries again on request', async () => {
    const fake = fakeEngine();
    const app = new App(fake.engine, memoryStore(), () => new Date());
    fake.load.reject(new Error('offline'));
    await app.start();
    expect(app.engineState).toBe('failed');

    (fake.engine.load as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    await app.retryLoad();
    expect(app.engineState).toBe('ready');
  });

  it('does not analyse until ffmpeg is ready', async () => {
    const fake = fakeEngine();
    const app = new App(fake.engine, memoryStore(), () => new Date());
    const started = app.start();
    app.addFiles([file('a')]);
    await settle();
    expect(fake.analyses).toHaveLength(0);
    fake.load.resolve();
    await started;
    await settle();
    expect(fake.analyses).toHaveLength(1);
  });
});
