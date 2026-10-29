import { CROSSFADE_STEP_SEC, DEFAULT_CROSSFADE_SEC, MAX_CROSSFADE_SEC, MAX_OUTPUT_BYTES, WAVE_RATE } from '../config';
import { outputName } from '../core/filename';
import { DEFAULT_FORMAT, estimateBytes, FORMATS, type FormatId, type OutputFormat } from '../core/formats';
import { buildPeaks, type Peaks } from '../core/peaks';
import { makePlan, type Plan } from '../core/plan';
import type { Progress } from '../core/progress';
import { timelineOf, type Segment, type Timeline } from '../core/timeline';
import type { AnalysisResult } from '../core/types';

/** What the app needs from ffmpeg; the browser uses ffmpeg.wasm, the tests a stand-in. */
export interface Engine {
  load(): Promise<void>;
  /** `onProgress` gets the share of the file read so far, or null when its length is unknown. */
  analyze(file: File, onProgress: (ratio: number | null) => void): Promise<AnalysisResult>;
  /** The finished file, and the mix as mono 16-bit samples at WAVE_RATE for its waveform. */
  render(
    plan: Plan,
    files: ReadonlyMap<string, File>,
    format: OutputFormat,
    onProgress: (progress: Progress) => void,
  ): Promise<{ file: Blob; wave: Int16Array }>;
  /** Stops a render under way; it then rejects. */
  stop(): void;
}

export interface Settings {
  /** Seconds, from 0 to MAX_CROSSFADE_SEC in steps of CROSSFADE_STEP_SEC. */
  crossfade: number;
  format: FormatId;
  /** End with a crossfade back into the start, so the file repeats without a break. */
  loop: boolean;
}

/** Where the settings are kept between visits; values read back may be missing or out of date. */
export interface SettingsStore {
  load(): Partial<Record<keyof Settings, unknown>>;
  save(settings: Settings): void;
}

export interface Track {
  id: string;
  file: File;
  /** null until the analysis is done. */
  result: AnalysisResult | null;
}

/** Where each track plays in the finished mix, named after its file. */
export interface MixTimeline {
  segments: (Segment & { name: string })[];
  crossfades: Timeline['crossfades'];
}

export type MixState =
  | { kind: 'idle' }
  | { kind: 'rendering'; progress: Progress }
  | { kind: 'done'; blob: Blob; name: string; format: OutputFormat; peaks: Peaks; timeline: MixTimeline }
  | { kind: 'failed'; logTail: string };

export type EngineState = 'loading' | 'ready' | 'failed';

/** The track being analysed and the share of it read so far; null when its length is unknown. */
export interface Analysing {
  id: string;
  ratio: number | null;
}

/** To the nearest step, written out exactly: 0.30000000000000004 becomes 0.3. */
const toStep = (seconds: number) => Number((Math.round(seconds / CROSSFADE_STEP_SEC) * CROSSFADE_STEP_SEC).toFixed(1));

function validSettings(saved: Partial<Record<keyof Settings, unknown>>): Settings {
  const { crossfade, format, loop } = saved;
  return {
    crossfade:
      typeof crossfade === 'number' && crossfade >= 0 && crossfade <= MAX_CROSSFADE_SEC
        ? toStep(crossfade)
        : DEFAULT_CROSSFADE_SEC,
    format: typeof format === 'string' && format in FORMATS ? (format as FormatId) : DEFAULT_FORMAT,
    loop: loop === true,
  };
}

/**
 * The app's state: the tracks in mix order, the settings, ffmpeg and the mix.
 * Files are analysed one at a time as they come, but not while a mix renders;
 * the list and the settings are locked while it does.
 */
export class App {
  #tracks: Track[] = [];
  #settings: Settings;
  #mixState: MixState = { kind: 'idle' };
  #engineState: EngineState = 'loading';
  #analysing: Analysing | null = null;
  #cancelled = false;
  /** The `#mixKey` of the mix being made or last made. */
  #mixedKey = '';
  #nextId = 1;
  #listeners: (() => void)[] = [];

  constructor(
    private readonly engine: Engine,
    private readonly store: SettingsStore,
    private readonly now: () => Date,
  ) {
    this.#settings = validSettings(store.load());
  }

  get tracks(): readonly Track[] {
    return this.#tracks;
  }

  get settings(): Settings {
    return this.#settings;
  }

  get mixState(): MixState {
    return this.#mixState;
  }

  get engineState(): EngineState {
    return this.#engineState;
  }

  get analysing(): Analysing | null {
    return this.#analysing;
  }

  get rendering(): boolean {
    return this.#mixState.kind === 'rendering';
  }

  /** One track to make a file from, so the app works as a plain converter; files that failed do not count. */
  get single(): boolean {
    return this.#tracks.filter((t) => t.result === null || t.result.ok).length === 1;
  }

  get plan(): Plan {
    return makePlan(this.#tracks, this.#settings.crossfade, this.#settings.loop);
  }

  get canMix(): boolean {
    return (
      this.#engineState === 'ready' &&
      !this.rendering &&
      this.#tracks.every((t) => t.result !== null) &&
      this.#tracks.some((t) => t.result?.ok)
    );
  }

  /** A finished mix whose tracks, order or settings have changed since: MIX makes it again. */
  get mixOutdated(): boolean {
    return this.#mixState.kind === 'done' && this.#mixKey() !== this.#mixedKey;
  }

  /** True when the output would likely not fit in the browser's memory. */
  get tooBig(): boolean {
    return estimateBytes(FORMATS[this.#settings.format], this.plan.total) > MAX_OUTPUT_BYTES;
  }

  onChange(listener: () => void): void {
    this.#listeners.push(listener);
  }

  /** Loads ffmpeg, then analyses whatever has been added meanwhile. */
  async start(): Promise<void> {
    this.#engineState = 'loading';
    this.#changed();
    try {
      await this.engine.load();
      this.#engineState = 'ready';
    } catch {
      this.#engineState = 'failed';
    }
    this.#changed();
    void this.#analyseNext();
  }

  retryLoad(): Promise<void> {
    return this.start();
  }

  addFiles(files: Iterable<File>): void {
    for (const file of files) this.#tracks.push({ id: `t${this.#nextId++}`, file, result: null });
    this.#edited();
    void this.#analyseNext();
  }

  move(from: number, to: number): void {
    if (this.rendering) return;
    const [track] = this.#tracks.splice(from, 1);
    if (!track) return;
    this.#tracks.splice(to, 0, track);
    this.#edited();
  }

  remove(id: string): void {
    if (this.rendering) return;
    this.#tracks = this.#tracks.filter((t) => t.id !== id);
    this.#edited();
  }

  /** Typed or slid: kept between 0 and MAX_CROSSFADE_SEC and rounded to the step; not a number, ignored. */
  setCrossfade(seconds: number): void {
    if (this.rendering || !Number.isFinite(seconds)) return;
    const crossfade = Math.min(Math.max(seconds, 0), MAX_CROSSFADE_SEC);
    this.#settings = validSettings({ ...this.#settings, crossfade });
    this.store.save(this.#settings);
    this.#edited();
  }

  setFormat(format: FormatId): void {
    if (this.rendering) return;
    this.#settings = validSettings({ ...this.#settings, format });
    this.store.save(this.#settings);
    this.#edited();
  }

  setLoop(loop: boolean): void {
    if (this.rendering) return;
    this.#settings = validSettings({ ...this.#settings, loop });
    this.store.save(this.#settings);
    this.#edited();
  }

  mix(): void {
    if (!this.canMix) return;
    const plan = this.plan;
    const format = FORMATS[this.#settings.format];
    const files = new Map(this.#tracks.map((t) => [t.id, t.file]));
    const names = plan.tracks.map((p) => files.get(p.id)!.name);
    const { segments, crossfades } = timelineOf(plan);
    const timeline: MixTimeline = {
      segments: segments.map((s) => ({ ...s, name: files.get(s.id)!.name })),
      crossfades,
    };
    this.#cancelled = false;
    this.#mixedKey = this.#mixKey();
    this.#mixState = { kind: 'rendering', progress: { ratio: 0, remaining: null } };
    this.#changed();

    this.engine
      .render(plan, files, format, (progress) => {
        if (!this.rendering) return;
        this.#mixState = { kind: 'rendering', progress };
        this.#changed();
      })
      .then(
        ({ file, wave }) => {
          this.#mixState = {
            kind: 'done',
            blob: file,
            name: outputName(names, format, this.now(), plan.loop > 0),
            format,
            peaks: buildPeaks(wave, WAVE_RATE),
            timeline,
          };
        },
        (error: unknown) => {
          // A failed render carries the end of ffmpeg's log for the error details.
          const logTail = (error as { logTail?: unknown })?.logTail;
          this.#mixState = this.#cancelled
            ? { kind: 'idle' }
            : { kind: 'failed', logTail: typeof logTail === 'string' ? logTail : String(error) };
        },
      )
      .finally(() => {
        this.#changed();
        void this.#analyseNext();
      });
  }

  /** Throws the finished mix away. */
  discard(): void {
    if (this.#mixState.kind !== 'done') return;
    this.#mixState = { kind: 'idle' };
    this.#changed();
  }

  cancel(): void {
    if (!this.rendering) return;
    this.#cancelled = true;
    this.engine.stop();
  }

  async #analyseNext(): Promise<void> {
    if (this.#analysing || this.#engineState !== 'ready' || this.rendering) return;
    const track = this.#tracks.find((t) => t.result === null);
    if (!track) return;
    this.#analysing = { id: track.id, ratio: 0 };
    try {
      const result = await this.engine.analyze(track.file, (ratio) => this.#analysed(ratio));
      this.#analysing = null;
      // The track may have been taken off the list meanwhile.
      if (this.#tracks.includes(track)) {
        track.result = result;
        this.#changed();
      }
    } catch {
      // ffmpeg itself failed, not the file: the track waits until it is loaded again.
      this.#analysing = null;
      this.#engineState = 'failed';
      this.#changed();
      return;
    }
    void this.#analyseNext();
  }

  /** Progress on the track being analysed; listeners hear of it only when the whole percentage shown changes. */
  #analysed(ratio: number | null): void {
    const before = this.#analysing;
    if (!before) return;
    const percent = (r: number | null) => (r === null ? null : Math.floor(r * 100));
    this.#analysing = { id: before.id, ratio };
    if (percent(ratio) !== percent(before.ratio)) this.#changed();
  }

  /**
   * The list or the settings changed. A finished mix stays, to be heard while adjusting,
   * and is marked out of date (`mixOutdated`); a failed one is cleared.
   */
  #edited(): void {
    if (this.#mixState.kind === 'failed') this.#mixState = { kind: 'idle' };
    this.#changed();
  }

  /** What a mix is made from: equal keys make the same file. */
  #mixKey(): string {
    return JSON.stringify([this.plan, this.#settings.format]);
  }

  #changed(): void {
    for (const listener of this.#listeners) listener();
  }
}
