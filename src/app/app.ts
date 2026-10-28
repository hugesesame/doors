import { DEFAULT_CROSSFADE_SEC, MAX_CROSSFADE_SEC, MAX_OUTPUT_BYTES } from '../config';
import { outputName } from '../core/filename';
import { DEFAULT_FORMAT, estimateBytes, FORMATS, type FormatId, type OutputFormat } from '../core/formats';
import { makePlan, type Plan } from '../core/plan';
import type { Progress } from '../core/progress';
import type { AnalysisResult } from '../core/types';

/** What the app needs from ffmpeg; the browser uses ffmpeg.wasm, the tests a stand-in. */
export interface Engine {
  load(): Promise<void>;
  analyze(file: File): Promise<AnalysisResult>;
  render(
    plan: Plan,
    files: ReadonlyMap<string, File>,
    format: OutputFormat,
    onProgress: (progress: Progress) => void,
  ): Promise<Blob>;
  /** Stops a render under way; it then rejects. */
  stop(): void;
}

export interface Settings {
  /** Seconds, a whole number from 0 to MAX_CROSSFADE_SEC. */
  crossfade: number;
  format: FormatId;
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

export type MixState =
  | { kind: 'idle' }
  | { kind: 'rendering'; progress: Progress }
  | { kind: 'done'; blob: Blob; name: string }
  | { kind: 'failed'; logTail: string };

export type EngineState = 'loading' | 'ready' | 'failed';

function validSettings(saved: Partial<Record<keyof Settings, unknown>>): Settings {
  const { crossfade, format } = saved;
  return {
    crossfade:
      typeof crossfade === 'number' && Number.isInteger(crossfade) && crossfade >= 0 && crossfade <= MAX_CROSSFADE_SEC
        ? crossfade
        : DEFAULT_CROSSFADE_SEC,
    format: typeof format === 'string' && format in FORMATS ? (format as FormatId) : DEFAULT_FORMAT,
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
  #analysing = false;
  #cancelled = false;
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

  get rendering(): boolean {
    return this.#mixState.kind === 'rendering';
  }

  get plan(): Plan {
    return makePlan(this.#tracks, this.#settings.crossfade);
  }

  get canMix(): boolean {
    return (
      this.#engineState === 'ready' &&
      !this.rendering &&
      this.#tracks.every((t) => t.result !== null) &&
      this.#tracks.some((t) => t.result?.ok)
    );
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

  setCrossfade(seconds: number): void {
    if (this.rendering) return;
    this.#settings = validSettings({ ...this.#settings, crossfade: seconds });
    this.store.save(this.#settings);
    this.#edited();
  }

  setFormat(format: FormatId): void {
    if (this.rendering) return;
    this.#settings = validSettings({ ...this.#settings, format });
    this.store.save(this.#settings);
    this.#edited();
  }

  mix(): void {
    if (!this.canMix) return;
    const plan = this.plan;
    const format = FORMATS[this.#settings.format];
    const files = new Map(this.#tracks.map((t) => [t.id, t.file]));
    const names = plan.tracks.map((p) => files.get(p.id)!.name);
    this.#cancelled = false;
    this.#mixState = { kind: 'rendering', progress: { ratio: 0, remaining: null } };
    this.#changed();

    this.engine
      .render(plan, files, format, (progress) => {
        if (!this.rendering) return;
        this.#mixState = { kind: 'rendering', progress };
        this.#changed();
      })
      .then(
        (blob) => {
          this.#mixState = { kind: 'done', blob, name: outputName(names, format, this.now()) };
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

  cancel(): void {
    if (!this.rendering) return;
    this.#cancelled = true;
    this.engine.stop();
  }

  async #analyseNext(): Promise<void> {
    if (this.#analysing || this.#engineState !== 'ready' || this.rendering) return;
    const track = this.#tracks.find((t) => t.result === null);
    if (!track) return;
    this.#analysing = true;
    try {
      const result = await this.engine.analyze(track.file);
      // The track may have been taken off the list meanwhile.
      if (this.#tracks.includes(track)) {
        track.result = result;
        this.#changed();
      }
    } catch {
      // ffmpeg itself failed, not the file: the track waits until it is loaded again.
      this.#engineState = 'failed';
      this.#changed();
      return;
    } finally {
      this.#analysing = false;
    }
    void this.#analyseNext();
  }

  /** The list or the settings changed: a finished mix no longer matches them. */
  #edited(): void {
    if (this.#mixState.kind === 'done' || this.#mixState.kind === 'failed') this.#mixState = { kind: 'idle' };
    this.#changed();
  }

  #changed(): void {
    for (const listener of this.#listeners) listener();
  }
}
