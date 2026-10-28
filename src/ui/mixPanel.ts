import type { App } from '../app/app';
import { h } from './dom';

/** "about 2 min left"; under a minute in seconds, rounded up to 5. */
function timeLeft(seconds: number): string {
  const time = seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${Math.max(5, Math.ceil(seconds / 5) * 5)} s`;
  return `about ${time} left`;
}

/** The MIX button, the progress while it renders, then the download (the timeline plays it), or what went wrong. */
export function createMixPanel(app: App) {
  const go = h('button', { type: 'button', class: 'go', onclick: () => app.mix() });
  const note = h('div', { class: 'mix-note' }, 'Loading ffmpeg…');

  const bar = h('div', { class: 'bar-fill' });
  const progressText = h('span', { class: 'progress-text' });
  const progress = h(
    'div',
    { class: 'progress', hidden: true },
    h('div', { class: 'bar' }, bar),
    h(
      'div',
      { class: 'progress-row' },
      progressText,
      h('button', { type: 'button', class: 'small', onclick: () => app.cancel() }, 'Cancel'),
    ),
  );

  const doneName = h('span', { class: 'done-name' });
  const download = h('a', { class: 'button primary' }, '⬇ Download');
  const result = h(
    'div',
    { class: 'result', hidden: true },
    h('div', { class: 'done' }, h('span', { class: 'done-label' }, 'Done'), doneName),
    download,
  );

  const detailsLog = h('pre', { class: 'log' });
  const details = h('details', {}, h('summary', {}, 'Details'), detailsLog);
  // ffmpeg says what went wrong at the end of its log, so that is what opens in view.
  details.addEventListener('toggle', () => {
    if (details.open) detailsLog.scrollTop = detailsLog.scrollHeight;
  });
  const failed = h(
    'div',
    { class: 'failed', hidden: true },
    h('div', { class: 'failed-text' }, 'Could not make the file.'),
    details,
  );

  const element = h('section', { class: 'mix' }, go, note, progress, result, failed);

  let shownBlob: Blob | null = null;
  let url: string | null = null;

  /** One object URL per finished file, released when the file goes. */
  function showFile(blob: Blob | null): void {
    if (blob === shownBlob) return;
    shownBlob = blob;
    if (url) URL.revokeObjectURL(url);
    url = blob ? URL.createObjectURL(blob) : null;
    if (url) download.href = url;
    else download.removeAttribute('href');
  }

  function update(): void {
    const state = app.mixState;
    go.textContent = app.single ? 'CONVERT' : 'MIX';
    go.disabled = !app.canMix;
    go.classList.toggle('running', state.kind === 'rendering');
    note.hidden = app.engineState !== 'loading';

    progress.hidden = state.kind !== 'rendering';
    if (state.kind === 'rendering') {
      const { ratio, remaining } = state.progress;
      bar.style.width = `${(ratio * 100).toFixed(1)}%`;
      progressText.textContent =
        ratio === 0
          ? 'Starting…'
          : [`${Math.floor(ratio * 100)}%`, remaining === null || remaining < 1 ? '' : timeLeft(remaining)]
              .filter(Boolean)
              .join(' · ');
    }

    result.hidden = state.kind !== 'done';
    showFile(state.kind === 'done' ? state.blob : null);
    if (state.kind === 'done') {
      doneName.textContent = state.name;
      download.download = state.name;
    }

    failed.hidden = state.kind !== 'failed';
    if (state.kind === 'failed') detailsLog.textContent = state.logTail;
  }

  return { element, update };
}
