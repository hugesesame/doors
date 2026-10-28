import type { Player } from '../app/player';
import { h } from './dom';

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 150;

/** A button that acts once on press and keeps repeating while held (as in Show Tracks). */
function repeatButton(label: string, title: string, action: () => void): HTMLButtonElement {
  const button = h('button', { type: 'button', title }, label);
  let delay: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    clearTimeout(delay);
    clearInterval(interval);
  };
  button.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    action();
    delay = setTimeout(() => {
      interval = setInterval(action, REPEAT_INTERVAL_MS);
    }, REPEAT_DELAY_MS);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, stop);
  // Keyboard activation (Enter on a focused button) still works once.
  button.addEventListener('click', (e) => {
    if (e.detail === 0) action();
  });
  return button;
}

/** The player's buttons, laid out as in Show Tracks without Fade, Duck and Loop. */
export function createTransport(player: Player) {
  const play = h('button', { type: 'button', class: 'play', title: 'Play / Stop (Space)', onclick: () => player.togglePlay() }, '▶');
  const buttons = [
    h('button', { type: 'button', title: 'Go to start (Home)', onclick: () => player.toStart() }, '⏮'),
    repeatButton('◀◀', 'Rewind 5s (⌥← / ,)', () => player.rewind()),
    play,
    repeatButton('▶▶', 'Fast forward 5s (⌥→ / .)', () => player.fastForward()),
    h('button', { type: 'button', title: 'Previous track (←)', onclick: () => player.previousTrack() }, '|◀'),
    h('button', { type: 'button', title: 'Next track (→)', onclick: () => player.nextTrack() }, '▶|'),
  ];
  const element = h('div', { class: 'transport' }, ...buttons);

  function update(): void {
    play.textContent = player.playing ? '■' : '▶';
    play.classList.toggle('playing', player.playing);
    for (const button of buttons) button.disabled = !player.loaded;
  }
  player.onChange(update);
  update();

  return { element, update };
}
