import type { App } from '../app/app';
import { APP_NAME, APP_VERSION } from '../config';
import { formatDuration } from '../core/time';
import { t } from '../i18n';
import { h } from './dom';

/** How many tracks go into the mix and how long it will be; the app name and version on the right. */
export function createFooter(app: App) {
  const count = h('span', { class: 'count' });
  const totalLabel = h('span', { class: 'total-label' });
  const total = h('span', { class: 'total' });

  const element = h(
    'footer',
    { class: 'footer' },
    h('div', { class: 'summary' }, count, totalLabel, total),
    h('div', { class: 'footer-right' }, h('span', { class: 'app-name' }, APP_NAME), h('span', { class: 'app-version' }, `v${APP_VERSION}`)),
  );

  function update(): void {
    const plan = app.plan;
    const n = plan.tracks.length;
    count.textContent = n === 1 ? t('summaryOne') : t('summary', { count: n });
    totalLabel.textContent = t('total');
    total.textContent = formatDuration(plan.total);
  }

  return { element, update };
}
