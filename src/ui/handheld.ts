import { h } from './dom';

/** Narrower than the layout's min-width in style.css (#app). */
const NARROW = '(max-width: 759px)';
/** Touch only, without a mouse or trackpad: a phone or a tablet, not a touch-screen laptop. */
const TOUCH_ONLY = '(hover: none) and (pointer: coarse)';

/** A phone, a tablet or a screen too narrow for the app. */
export function isHandheld(matchMedia: (query: string) => { matches: boolean } = window.matchMedia): boolean {
  return matchMedia(TOUCH_ONLY).matches || matchMedia(NARROW).matches;
}

/**
 * Says that DOORS is made for a computer, on a phone or tablet only, where the page would
 * otherwise just look broken. It can be closed and the app tried anyway.
 */
export function createHandheldNotice(): HTMLElement | null {
  if (!isHandheld((query) => window.matchMedia(query))) return null;
  const notice = h(
    'div',
    { class: 'handheld-notice', role: 'alert' },
    h(
      'p',
      {},
      h('strong', {}, 'DOORS is made for a computer.'),
      ' Open it in Chrome, Edge, Safari or Firefox on a desktop or laptop: on a phone or tablet it may not work.',
    ),
    h('button', { type: 'button', onclick: () => notice.remove() }, 'Close'),
  );
  return notice;
}
