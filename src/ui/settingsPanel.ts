import type { App } from '../app/app';
import { CROSSFADE_STEP_SEC, MAX_CROSSFADE_SEC } from '../config';
import { FORMATS, type FormatId } from '../core/formats';
import { h } from './dom';

/** SETTINGS: the crossfade (for a single track, only with Loop), Loop and the output format. */
export function createSettingsPanel(app: App) {
  /** One length for every join: there is no per-track crossfade, and the tooltips say so. */
  const crossfadeHint = 'One crossfade for every join between tracks';
  const crossfade = h('input', {
    type: 'range',
    min: 0,
    max: MAX_CROSSFADE_SEC,
    step: CROSSFADE_STEP_SEC,
    title: crossfadeHint,
  });
  crossfade.addEventListener('input', () => app.setCrossfade(Number(crossfade.value)));
  // The exact value can be typed too; it is taken on Enter or on leaving the field.
  const crossfadeValue = h('input', {
    type: 'number',
    class: 'setting-number',
    min: 0,
    max: MAX_CROSSFADE_SEC,
    step: CROSSFADE_STEP_SEC,
    title: `${crossfadeHint}, in seconds`,
  });
  crossfadeValue.addEventListener('change', () => {
    app.setCrossfade(crossfadeValue.value === '' ? Number.NaN : Number(crossfadeValue.value));
    // Shows what was taken: rounded, kept in range, or back to the setting if it was not a number.
    crossfadeValue.value = app.settings.crossfade.toFixed(1);
  });
  crossfadeValue.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') crossfadeValue.blur();
  });
  const crossfadeRow = h(
    'div',
    { class: 'setting' },
    h('span', { class: 'setting-label', title: crossfadeHint }, 'Crossfade'),
    crossfade,
    h('span', { class: 'setting-value' }, crossfadeValue, h('span', { class: 'unit' }, 's')),
  );

  const loopHint = 'One pass through the list whose end crossfades into its start, so a player set to repeat plays it without a break';
  const loop = h('input', { type: 'checkbox', title: loopHint });
  loop.addEventListener('change', () => app.setLoop(loop.checked));
  const loopRow = h(
    'label',
    { class: 'setting', title: loopHint },
    h('span', { class: 'setting-label' }, 'Loop'),
    h('span', { class: 'setting-check' }, loop, h('span', { class: 'setting-hint' }, 'For seamless repeat play')),
  );

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
    h('div', { class: 'settings-body' }, crossfadeRow, loopRow, formatRow, tooBig),
  );

  function update(): void {
    const { settings } = app;
    // Leave the slider and the field alone while they are being used.
    if (document.activeElement !== crossfadeValue) crossfadeValue.value = settings.crossfade.toFixed(1);
    if (document.activeElement !== crossfade) crossfade.value = String(settings.crossfade);
    crossfade.style.setProperty('--fill', `${(settings.crossfade / MAX_CROSSFADE_SEC) * 100}%`);
    format.value = settings.format;
    loop.checked = settings.loop;
    crossfade.disabled = crossfadeValue.disabled = loop.disabled = format.disabled = app.rendering;
    // A single track has nothing to crossfade into, except its own start when it loops.
    crossfadeRow.hidden = app.single && !settings.loop;
    tooBig.hidden = !app.tooBig;
  }

  return { element, update };
}
