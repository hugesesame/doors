import type { Player } from '../app/player';
import { isEditing } from './dom';
import { toggleFullscreen } from './fullscreen';

export type ZoomControls = { zoomIn(): void; zoomOut(): void; zoomFit(): void };

/** The shortcuts, on the same keys as in Show Tracks wherever it has the same thing. */
export function installKeyboard(player: Player, zoom: ZoomControls, openHelp: () => void): void {
  window.addEventListener('keydown', (e) => {
    if (isEditing(e.target) || e.metaKey || e.ctrlKey) return;
    if (document.querySelector('dialog[open]')) return;

    if (e.key === '?') {
      e.preventDefault();
      openHelp();
      return;
    }

    // / fits the whole mix; so does Shift+Z, as in Final Cut Pro and Resolve.
    if (e.key === '/' || (e.code === 'Slash' && !e.shiftKey) || (e.code === 'KeyZ' && e.shiftKey)) {
      e.preventDefault();
      zoom.zoomFit();
      return;
    }

    // = / + zoom in, - zooms out. e.key first so a JIS keyboard's Shift+- ("=") zooms in;
    // e.code covers an active IME, where e.key is "Process".
    const zoomKey =
      e.key === '=' || e.key === '+' ? 'in' : e.key === '-' ? 'out'
      : e.code === 'Equal' ? 'in' : e.code === 'Minus' ? 'out' : null;
    if (zoomKey) {
      e.preventDefault();
      if (zoomKey === 'in') zoom.zoomIn();
      else zoom.zoomOut();
      return;
    }

    const actions: Record<string, () => void> = {
      Space: () => player.togglePlay(),
      KeyF: () => toggleFullscreen(),
      // Arrows jump between the tracks' starts; with Option they rewind / fast forward.
      ArrowLeft: () => (e.altKey ? player.rewind() : player.previousTrack()),
      ArrowRight: () => (e.altKey ? player.fastForward() : player.nextTrack()),
      ArrowUp: () => player.previousTrack(),
      ArrowDown: () => player.nextTrack(),
      Home: () => player.toStart(),
      // , and . sit in the same place on US and JIS keyboards (and match Logic Pro).
      Comma: () => player.rewind(),
      Period: () => player.fastForward(),
    };
    // e.code keeps F working with a Japanese IME layout.
    const action = actions[e.code];
    if (!action) return;
    if (e.repeat && ['KeyF', 'Space'].includes(e.code)) return;
    e.preventDefault();
    // A focused button (MIX!) would otherwise also react to Space.
    if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
    action();
  });
}
