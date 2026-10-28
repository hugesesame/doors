import type { App } from '../app/app';
import { CROSSFADE_STEP_SEC, MAX_CROSSFADE_SEC } from '../config';
import { FORMATS, type FormatId } from '../core/formats';
import { h } from './dom';

/** SETTINGS: the crossfade (not shown for a single track) and the output format. */
export function createSettingsPanel(app: App) {
  const crossfadeValue = h('span', { class: 'setting-value' });
  const crossfade = h('input', { type: 'range', min: 0, max: MAX_CROSSFADE_SEC, step: CROSSFADE_STEP_SEC });
  crossfade.addEventListener('input', () => app.setCrossfade(Number(crossfade.value)));
  const crossfadeRow = h('label', { class: 'setting' }, h('span', { class: 'setting-label' }, 'Crossfade'), crossfade, crossfadeValue);

  const format = h(
    'select',
    {},
    ...Object.values(FORMATS).map((f) => h('option', { value: f.id }, f.label)),
  );
  format.addEventListener('change', () => app.setFormat(format.value as FormatId));
  const formatRow = h('label', { class: 'setting' }, h('span', { class: 'setting-label' }, 'Format'), format);
  const tooBig = h('div', { class: 'warning' }, 'Over 1 GB: this may not fit in the browser’s memory. MP3 is recommended.');

  const element = h(
    'section',
    { class: 'settings' },
    h('div', { class: 'panel-title' }, 'Settings'),
    h('div', { class: 'settings-body' }, crossfadeRow, formatRow, tooBig),
  );

  function update(): void {
    const { settings } = app;
    crossfadeValue.textContent = `${settings.crossfade.toFixed(1)} s`;
    // Leave the slider alone while it is being dragged.
    if (document.activeElement !== crossfade) crossfade.value = String(settings.crossfade);
    crossfade.style.setProperty('--fill', `${(settings.crossfade / MAX_CROSSFADE_SEC) * 100}%`);
    format.value = settings.format;
    crossfade.disabled = format.disabled = app.rendering;
    crossfadeRow.hidden = app.single;
    tooBig.hidden = !app.tooBig;
  }

  return { element, update };
}
