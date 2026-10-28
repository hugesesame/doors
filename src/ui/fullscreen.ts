import { h } from './dom';

/** Toggles fullscreen. Must run inside a user gesture (a click or a key press). */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  else void document.documentElement.requestFullscreen().catch(() => {});
}

/**
 * The Fullscreen / Exit Fullscreen button; F does the same from anywhere.
 * The label follows the actual state, so leaving with Esc updates it too.
 */
export function createFullscreenButton(): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'small', title: 'Fullscreen (F)', onclick: toggleFullscreen });
  const show = () => (button.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen');
  document.addEventListener('fullscreenchange', show);
  show();

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    e.preventDefault();
    toggleFullscreen();
  });

  return button;
}
