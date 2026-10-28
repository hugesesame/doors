import { h } from './dom';

/** Toggles fullscreen. Must run inside a user gesture (a click or a key press). */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void document.documentElement.requestFullscreen().catch(() => {});
}

/**
 * The Fullscreen / Exit Fullscreen button (F in ui/keyboard.ts does the same).
 * The label follows the actual state, so leaving with Esc updates it too.
 */
export function createFullscreenButton(): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'small', title: 'Fullscreen (F)', onclick: toggleFullscreen });
  const show = () => (button.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen');
  document.addEventListener('fullscreenchange', show);
  show();
  return button;
}
