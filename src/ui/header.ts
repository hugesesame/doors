import type { App } from '../app/app';
import { APP_NAME } from '../config';
import { h } from './dom';
import { createFullscreenButton } from './fullscreen';

/** The app name, the notice when ffmpeg could not be loaded, and the Fullscreen and Help buttons. */
export function createHeader(app: App, openHelp: () => void) {
  const banner = h(
    'div',
    { class: 'engine-banner', hidden: true },
    h('span', {}, 'Could not load ffmpeg. Check your connection and try again.'),
    h('button', { type: 'button', onclick: () => void app.retryLoad() }, 'Retry'),
  );

  const element = h(
    'header',
    { class: 'header' },
    h('div', { class: 'brand' }, APP_NAME),
    banner,
    h(
      'div',
      { class: 'header-right' },
      createFullscreenButton(),
      h('button', { type: 'button', class: 'small', title: 'Help (?)', onclick: openHelp }, '? Help'),
    ),
  );

  function update(): void {
    banner.hidden = app.engineState !== 'failed';
  }

  return { element, update };
}
