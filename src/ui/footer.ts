import type { App } from '../app/app';
import { APP_NAME, APP_VERSION } from '../config';
import { formatDuration } from '../core/time';
import { h } from './dom';

/** How many tracks go into the mix and how long it will be; the player in the middle; the app name and version on the right. */
export function createFooter(app: App, transport: HTMLElement) {
  const count = h('span', { class: 'count' });
  const total = h('span', { class: 'total' });
  const offlineReady = h(
    'span',
    { class: 'offline-ready', hidden: true, title: 'This browser keeps a copy of the app, so it opens without a connection' },
    'Ready offline',
  );

  const element = h(
    'footer',
    { class: 'footer' },
    h('div', { class: 'summary' }, count, h('span', { class: 'total-label' }, 'Total'), total),
    transport,
    h(
      'div',
      { class: 'footer-right' },
      offlineReady,
      h('span', { class: 'app-name' }, APP_NAME),
      h('span', { class: 'app-version' }, `v${APP_VERSION}`),
    ),
  );

  function update(): void {
    const plan = app.plan;
    const n = plan.tracks.length;
    count.textContent = n === 1 ? '1 track' : `${n} tracks`;
    total.textContent = formatDuration(plan.total);
  }

  return { element, update, showOfflineReady: () => (offlineReady.hidden = false) };
}
