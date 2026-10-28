import type { App } from '../app/app';
import { APP_NAME } from '../config';
import { h } from './dom';

/** The app name, and the notice when ffmpeg could not be loaded. */
export function createHeader(app: App) {
  const banner = h(
    'div',
    { class: 'engine-banner', hidden: true },
    h('span', {}, 'Could not load ffmpeg. Check your connection and try again.'),
    h('button', { type: 'button', onclick: () => void app.retryLoad() }, 'Retry'),
  );

  const element = h('header', { class: 'header' }, h('div', { class: 'brand' }, APP_NAME), banner);

  function update(): void {
    banner.hidden = app.engineState !== 'failed';
  }

  return { element, update };
}
