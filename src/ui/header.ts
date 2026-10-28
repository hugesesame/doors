import type { App } from '../app/app';
import { APP_NAME } from '../config';
import { currentLang, setLang, t, type Lang } from '../i18n';
import { h } from './dom';

/** The app name, the language switch, and the notice when ffmpeg could not be loaded. */
export function createHeader(app: App) {
  const langButton = (lang: Lang, label: string) =>
    h('button', { type: 'button', 'data-lang': lang, onclick: () => setLang(lang) }, label);
  const langs = h('div', { class: 'segmented' }, langButton('en', 'ENG'), langButton('ja', 'JPN'));

  const notice = h('span');
  const retry = h('button', { type: 'button', onclick: () => void app.retryLoad() });
  const banner = h('div', { class: 'engine-banner', hidden: true }, notice, retry);

  const element = h(
    'header',
    { class: 'header' },
    h('div', { class: 'brand' }, APP_NAME),
    banner,
    h('div', { class: 'header-right' }, langs),
  );

  function update(): void {
    for (const b of langs.querySelectorAll<HTMLElement>('button')) b.classList.toggle('active', b.dataset.lang === currentLang());
    banner.hidden = app.engineState !== 'failed';
    notice.textContent = t('engineFailed');
    retry.textContent = t('retry');
  }

  return { element, update };
}
