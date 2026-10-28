import type { App } from '../app/app';
import { MAX_CROSSFADE_SEC } from '../config';
import { FORMATS, type FormatId } from '../core/formats';
import { t } from '../i18n';
import { h } from './dom';

/** SETTINGS: the crossfade (not shown for a single track) and the output format. */
export function createSettingsPanel(app: App) {
  const title = h('div', { class: 'panel-title' });

  const crossfadeLabel = h('span', { class: 'setting-label' });
  const crossfadeValue = h('span', { class: 'setting-value' });
  const crossfade = h('input', { type: 'range', min: 0, max: MAX_CROSSFADE_SEC, step: 1 });
  crossfade.addEventListener('input', () => app.setCrossfade(Number(crossfade.value)));
  const crossfadeRow = h('label', { class: 'setting' }, crossfadeLabel, crossfade, crossfadeValue);

  const formatLabel = h('span', { class: 'setting-label' });
  const format = h(
    'select',
    {},
    ...Object.values(FORMATS).map((f) => h('option', { value: f.id }, f.label)),
  );
  format.addEventListener('change', () => app.setFormat(format.value as FormatId));
  const formatRow = h('label', { class: 'setting' }, formatLabel, format);
  const tooBig = h('div', { class: 'warning' });

  const element = h('section', { class: 'settings' }, title, h('div', { class: 'settings-body' }, crossfadeRow, formatRow, tooBig));

  function update(): void {
    const { settings } = app;
    title.textContent = t('settings');
    crossfadeLabel.textContent = t('crossfade');
    crossfadeValue.textContent = t('seconds', { n: settings.crossfade });
    formatLabel.textContent = t('format');
    // Leave the slider alone while it is being dragged.
    if (document.activeElement !== crossfade) crossfade.value = String(settings.crossfade);
    format.value = settings.format;
    crossfade.disabled = format.disabled = app.rendering;
    crossfadeRow.hidden = app.tracks.length === 1;
    tooBig.textContent = t('tooBig');
    tooBig.hidden = !app.tooBig;
  }

  return { element, update };
}
