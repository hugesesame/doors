import type { App, Track } from '../app/app';
import { formatDuration } from '../core/time';
import type { TrackError } from '../core/types';
import { t } from '../i18n';
import { h } from './dom';

/** A press has to move this far (px) before it turns into a drag. */
const DRAG_START_PX = 4;

const errorText: Record<TrackError, () => string> = {
  unreadable: () => t('unreadable'),
  'no-audio': () => t('noAudio'),
  silent: () => t('silent'),
};

/** TRACKS: the files in mix order, dragged to reorder; with the Add Files button and the empty-list hint. */
export function createTrackList(app: App) {
  const input = h('input', { type: 'file', multiple: true, hidden: true });
  input.addEventListener('change', () => {
    if (input.files) app.addFiles([...input.files]);
    input.value = '';
  });
  const addButton = h('button', { type: 'button', class: 'small', onclick: () => input.click() });

  const title = h('span');
  const head = h('div', { class: 'track-row track-head' });
  const list = h('div', { class: 'track-list' });
  const dropLine = h('div', { class: 'drop-line', hidden: true });
  const emptyTitle = h('div', { class: 'empty-title' });
  const emptyHint = h('div', { class: 'empty-hint' });
  const emptyAdd = h('button', { type: 'button', onclick: () => input.click() });
  const empty = h('div', { class: 'empty' }, emptyTitle, emptyHint, emptyAdd);

  const element = h(
    'section',
    { class: 'panel tracks' },
    h('div', { class: 'panel-title' }, title, addButton),
    head,
    list,
    input,
  );

  let dragging = false;
  // A change that arrives mid-drag would rebuild the row being dragged; it waits for the drop.
  let dirty = false;

  function status(track: Track): { text: string; error: boolean } {
    if (track.result) return track.result.ok ? { text: '', error: false } : { text: errorText[track.result.error](), error: true };
    const analysing =
      app.engineState === 'ready' && !app.rendering && app.tracks.find((tr) => tr.result === null) === track;
    return { text: analysing ? t('analysing') : t('waiting'), error: false };
  }

  function row(track: Track, index: number): HTMLElement {
    const analysis = track.result?.ok ? track.result.analysis : null;
    const { text, error } = status(track);
    const el = h(
      'div',
      { class: `track-row${error ? ' error' : ''}`, 'data-id': track.id },
      h('span', { class: 'grip', title: t('dragHint') }, '⠿'),
      h('span', { class: 'num' }, String(index + 1)),
      h(
        'span',
        { class: 'name', title: track.file.name },
        h('span', { class: 'file' }, track.file.name),
        text ? h('span', { class: 'status' }, text) : null,
      ),
      h('span', { class: 'length' }, analysis ? formatDuration(analysis.duration) : ''),
      h('span', { class: 'loudness' }, analysis ? `${analysis.lufs.toFixed(1)} LUFS` : ''),
      h(
        'button',
        { type: 'button', class: 'remove', title: t('remove'), disabled: app.rendering, onclick: () => app.remove(track.id) },
        '×',
      ),
    );
    makeDraggable(el, index);
    return el;
  }

  /** Where a drop at `y` would put the dragged row, counted among the other rows. */
  function dropIndex(y: number, from: number): number {
    const rows = [...list.querySelectorAll<HTMLElement>('.track-row')].filter((_, i) => i !== from);
    const index = rows.findIndex((r) => y < r.getBoundingClientRect().top + r.offsetHeight / 2);
    return index === -1 ? rows.length : index;
  }

  function showDropLine(index: number, from: number): void {
    const rows = [...list.querySelectorAll<HTMLElement>('.track-row')].filter((_, i) => i !== from);
    const last = rows[rows.length - 1];
    const top = index < rows.length ? rows[index].offsetTop : last ? last.offsetTop + last.offsetHeight : 0;
    dropLine.style.top = `${top - 1}px`;
    dropLine.hidden = false;
  }

  /** Press and drag a row to reorder; not while a mix renders, and not from the remove button. */
  function makeDraggable(el: HTMLElement, from: number): void {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || app.rendering || (e.target as HTMLElement).closest('button')) return;
      const startY = e.clientY;
      // Captured from the press, so a quick drag that leaves the row at once is still followed.
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        if (!dragging && Math.abs(ev.clientY - startY) < DRAG_START_PX) return;
        if (!dragging) {
          dragging = true;
          el.classList.add('dragging');
        }
        showDropLine(dropIndex(ev.clientY, from), from);
      };
      const up = (ev: PointerEvent) => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        if (!dragging) return;
        dragging = false;
        el.classList.remove('dragging');
        dropLine.hidden = true;
        if (ev.type === 'pointerup') app.move(from, dropIndex(ev.clientY, from));
        if (dirty) update();
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  }

  function update(): void {
    if (dragging) {
      dirty = true;
      return;
    }
    dirty = false;
    title.textContent = t('tracks');
    addButton.textContent = `+ ${t('addFiles')}`;
    emptyTitle.textContent = t('emptyTitle');
    emptyHint.textContent = t('emptyHint');
    emptyAdd.textContent = t('addFiles');
    head.replaceChildren(
      h('span'),
      h('span', { class: 'num' }, '#'),
      h('span', {}, t('colName')),
      h('span', { class: 'length' }, t('colLength')),
      h('span', { class: 'loudness' }, t('colLoudness')),
      h('span'),
    );
    head.hidden = app.tracks.length === 0;
    element.classList.toggle('locked', app.rendering);
    list.replaceChildren(...app.tracks.map(row), dropLine, ...(app.tracks.length ? [] : [empty]));
  }

  return { element, update };
}
