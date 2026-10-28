import { FFFSType, FFmpeg } from '@ffmpeg/ffmpeg';

/** Where the input files are mounted; read in place, never copied into ffmpeg's memory. */
export const INPUT_DIR = '/in';

export interface RunResult {
  /** ffmpeg's exit code: 0 when it succeeded. */
  code: number;
  log: string;
}

/** A file's extension with its dot, such as ".mp3", or "" without one. */
export function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

/**
 * The one ffmpeg.wasm the app uses. Commands run one at a time, in the order they
 * were asked for; ffmpeg is loaded on first use, and again after `stop`.
 */
export class Ffmpeg {
  #ffmpeg: FFmpeg | null = null;
  #loading: Promise<FFmpeg> | null = null;
  #queue: Promise<unknown> = Promise.resolve();
  #lines: string[] = [];
  #onLine: ((line: string) => void) | null = null;

  /** Loads ffmpeg now, so the first command does not wait for it; fails if the core cannot be fetched. */
  load(): Promise<FFmpeg> {
    this.#loading ??= this.#start().catch((error: unknown) => {
      this.#loading = null;
      throw error;
    });
    return this.#loading;
  }

  async #start(): Promise<FFmpeg> {
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      this.#lines.push(message);
      this.#onLine?.(message);
    });
    // Served from the app's own site (scripts/copy-ffmpeg.mjs), so it works offline too.
    const base = new URL('./ffmpeg/', document.baseURI).href;
    await ffmpeg.load({ coreURL: `${base}ffmpeg-core.js`, wasmURL: `${base}ffmpeg-core.wasm` });
    await ffmpeg.createDir(INPUT_DIR);
    this.#ffmpeg = ffmpeg;
    return ffmpeg;
  }

  /**
   * Runs ffmpeg with `files` mounted in INPUT_DIR under their own names.
   * `onLine` sees each log line as it comes, for progress.
   */
  run(args: string[], files: File[], onLine?: (line: string) => void): Promise<RunResult> {
    const job = this.#queue.then(() => this.#run(args, files, onLine));
    this.#queue = job.catch(() => {
      // A failed command does not hold up the next one.
    });
    return job;
  }

  async #run(args: string[], files: File[], onLine?: (line: string) => void): Promise<RunResult> {
    const ffmpeg = await this.load();
    this.#lines = [];
    this.#onLine = onLine ?? null;
    await ffmpeg.mount(FFFSType.WORKERFS, { files }, INPUT_DIR);
    try {
      const code = await ffmpeg.exec(args);
      return { code, log: this.#lines.join('\n') };
    } finally {
      this.#onLine = null;
      // After `stop` the worker is gone, and so is the mount.
      await ffmpeg.unmount(INPUT_DIR).catch(() => {});
    }
  }

  /** Takes a file ffmpeg wrote out of its memory. */
  async take(path: string): Promise<Uint8Array> {
    const ffmpeg = await this.load();
    const data = await ffmpeg.readFile(path);
    await ffmpeg.deleteFile(path);
    if (typeof data === 'string') throw new Error(`${path} came back as text`);
    return data;
  }

  /** Stops whatever is running: its `run` rejects, and ffmpeg loads afresh for the next command. */
  stop(): void {
    this.#ffmpeg?.terminate();
    this.#ffmpeg = null;
    this.#loading = null;
  }
}
