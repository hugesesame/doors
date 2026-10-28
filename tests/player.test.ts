import { describe, expect, it, vi } from 'vitest';
import { Player, type MediaLike, type PlayerSource } from '../src/app/player';

/** Stands in for an <audio> element. */
function fakeMedia() {
  const listeners: Record<string, (() => void)[]> = {};
  const media = {
    currentTime: 0,
    paused: true,
    src: '',
    play: vi.fn(async () => {
      media.paused = false;
      for (const fn of listeners.play ?? []) fn();
    }),
    pause: vi.fn(() => {
      media.paused = true;
      for (const fn of listeners.pause ?? []) fn();
    }),
    removeAttribute: vi.fn(() => {
      media.src = '';
    }),
    addEventListener: (type: string, fn: () => void) => (listeners[type] ??= []).push(fn),
  };
  return media satisfies MediaLike;
}

function setup(mix: PlayerSource | null = { blob: new Blob(['x']), duration: 200, starts: [0, 96, 154] }) {
  const media = fakeMedia();
  let source = mix;
  let notify = () => {};
  const urls = { create: vi.fn(() => 'blob:mix'), revoke: vi.fn() };
  const player = new Player(() => source, (fn) => (notify = fn), media, urls);
  const change = (next: PlayerSource | null) => {
    source = next;
    notify();
  };
  return { player, media, urls, change };
}

describe('Player', () => {
  it('loads the finished mix', () => {
    const { player, media } = setup();
    expect(media.src).toBe('blob:mix');
    expect(player.duration).toBe(200);
  });

  it('moves the playhead without starting to play', () => {
    const { player, media } = setup();
    player.seek(50);
    expect(media.currentTime).toBe(50);
    expect(media.play).not.toHaveBeenCalled();
  });

  it('keeps the playhead inside the mix', () => {
    const { player, media } = setup();
    player.seek(-3);
    expect(media.currentTime).toBe(0);
    player.seek(999);
    expect(media.currentTime).toBe(200);
  });

  it('skips 5 s back and forward', () => {
    const { player, media } = setup();
    player.seek(10);
    player.fastForward();
    expect(media.currentTime).toBe(15);
    player.rewind();
    player.rewind();
    player.rewind();
    expect(media.currentTime).toBe(0);
  });

  it('goes to the start of the mix', () => {
    const { player, media } = setup();
    player.seek(120);
    player.toStart();
    expect(media.currentTime).toBe(0);
  });

  it('jumps between the starts of the tracks', () => {
    const { player, media } = setup();
    player.seek(120);
    player.previousTrack();
    expect(media.currentTime).toBe(96);
    player.previousTrack();
    expect(media.currentTime).toBe(0);
    player.nextTrack();
    expect(media.currentTime).toBe(96);
    player.seek(160);
    player.nextTrack();
    expect(media.currentTime).toBe(160);
  });

  it('plays and stops where it is', () => {
    const { player, media } = setup();
    player.seek(30);
    player.togglePlay();
    expect(player.playing).toBe(true);
    player.togglePlay();
    expect(player.playing).toBe(false);
    expect(media.currentTime).toBe(30);
  });

  it('starts again from the top when played at the very end', () => {
    const { player, media } = setup();
    player.seek(200);
    player.togglePlay();
    expect(media.currentTime).toBe(0);
  });

  it('does nothing without a mix', () => {
    const { player, media } = setup(null);
    player.togglePlay();
    player.seek(10);
    expect(media.play).not.toHaveBeenCalled();
    expect(media.currentTime).toBe(0);
  });

  it('lets go of a mix that is gone, and loads a new one from the top', () => {
    const { player, media, urls, change } = setup();
    player.seek(50);
    player.togglePlay();
    change(null);
    expect(player.playing).toBe(false);
    expect(media.removeAttribute).toHaveBeenCalledWith('src');
    expect(urls.revoke).toHaveBeenCalledWith('blob:mix');

    change({ blob: new Blob(['y']), duration: 100, starts: [0] });
    expect(media.src).toBe('blob:mix');
    expect(media.currentTime).toBe(0);
    expect(player.duration).toBe(100);
  });

  it('keeps playing the same mix through other changes', () => {
    const blob = new Blob(['x']);
    const { player, urls, change } = setup({ blob, duration: 200, starts: [0] });
    player.togglePlay();
    change({ blob, duration: 200, starts: [0] });
    expect(player.playing).toBe(true);
    expect(urls.create).toHaveBeenCalledTimes(1);
  });

  it('tells listeners when it plays, stops or moves', () => {
    const { player } = setup();
    const listener = vi.fn();
    player.onChange(listener);
    player.seek(10);
    player.togglePlay();
    player.togglePlay();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
