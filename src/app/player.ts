import { nextStart, previousStart } from '../core/markers';

/** Seconds ◀◀ and ▶▶ move, as in Show Tracks. */
const SKIP_SECONDS = 5;
/** Played this close to the end, it starts again from the top. */
const AT_END = 0.05;

/** The finished mix to play: the file, its length and where each track starts. */
export interface PlayerSource {
  blob: Blob;
  duration: number;
  starts: number[];
}

/** What the player needs of an <audio> element, so the tests can stand one in. */
export interface MediaLike {
  currentTime: number;
  readonly paused: boolean;
  src: string;
  play(): Promise<void>;
  pause(): void;
  removeAttribute(name: string): void;
  addEventListener(type: string, listener: () => void): void;
}

/**
 * Plays the finished mix. Moving the playhead never starts playback; playing goes on from
 * wherever the playhead is, and stopping leaves it there. A new mix loads from the top.
 */
export class Player {
  #shown: Blob | null = null;
  #url: string | null = null;
  #listeners: (() => void)[] = [];

  constructor(
    private readonly source: () => PlayerSource | null,
    subscribe: (onChange: () => void) => void,
    private readonly media: MediaLike = new Audio(),
    private readonly urls = {
      create: (blob: Blob) => URL.createObjectURL(blob),
      revoke: (url: string) => URL.revokeObjectURL(url),
    },
  ) {
    for (const type of ['play', 'pause', 'ended']) media.addEventListener(type, () => this.#changed());
    subscribe(() => this.#load());
    this.#load();
  }

  get loaded(): boolean {
    return this.source() !== null;
  }

  get playing(): boolean {
    return !this.media.paused;
  }

  get time(): number {
    return this.media.currentTime;
  }

  get duration(): number {
    return this.source()?.duration ?? 0;
  }

  onChange(listener: () => void): void {
    this.#listeners.push(listener);
  }

  togglePlay(): void {
    if (!this.loaded) return;
    if (this.playing) {
      this.media.pause();
      return;
    }
    if (this.media.currentTime >= this.duration - AT_END) this.media.currentTime = 0;
    void this.media.play().catch(() => {});
  }

  /** Moves the playhead; playing goes on from there, stopped stays stopped. */
  seek(time: number): void {
    if (!this.loaded) return;
    this.media.currentTime = Math.min(Math.max(time, 0), this.duration);
    this.#changed();
  }

  toStart(): void {
    this.seek(0);
  }

  rewind(): void {
    this.seek(this.time - SKIP_SECONDS);
  }

  fastForward(): void {
    this.seek(this.time + SKIP_SECONDS);
  }

  previousTrack(): void {
    const mix = this.source();
    if (mix) this.seek(previousStart(mix.starts, this.time));
  }

  nextTrack(): void {
    const mix = this.source();
    const next = mix && nextStart(mix.starts, this.time);
    if (next !== null && next !== undefined) this.seek(next);
  }

  /** Loads a new finished mix, or lets go of one that is gone. */
  #load(): void {
    const blob = this.source()?.blob ?? null;
    if (blob === this.#shown) return;
    this.#shown = blob;
    if (this.playing) this.media.pause();
    if (this.#url) this.urls.revoke(this.#url);
    this.#url = blob ? this.urls.create(blob) : null;
    if (this.#url) {
      this.media.src = this.#url;
      this.media.currentTime = 0;
    } else {
      this.media.removeAttribute('src');
    }
    this.#changed();
  }

  #changed(): void {
    for (const listener of this.#listeners) listener();
  }
}
