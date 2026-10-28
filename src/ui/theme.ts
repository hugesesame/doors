import { h } from './dom';

type Theme = 'day' | 'night';

/** Also read by the script in index.html, which sets the theme before the page is drawn. */
const THEME_KEY = 'doors-theme';

/** Also tells what draws on a canvas (the waveform) to draw again in the new colours. */
function apply(theme: Theme): void {
  if (theme === 'night') document.documentElement.dataset.theme = 'night';
  else delete document.documentElement.dataset.theme;
  document.dispatchEvent(new Event('doors-theme'));
}

/** Day / Night: Day unless Night was chosen in this browser before. */
export function createThemeSwitch(): HTMLElement {
  const current = (): Theme => (document.documentElement.dataset.theme === 'night' ? 'night' : 'day');
  const button = (theme: Theme, label: string) =>
    h(
      'button',
      {
        type: 'button',
        'data-theme': theme,
        title: `${label} Mode`,
        onclick: () => {
          apply(theme);
          try {
            localStorage.setItem(THEME_KEY, theme);
          } catch {
            // The page still switches; it just opens in Day mode next time.
          }
          show();
        },
      },
      label,
    );
  const element = h('div', { class: 'segmented' }, button('day', 'Day'), button('night', 'Night'));
  const show = () => {
    for (const b of element.querySelectorAll<HTMLElement>('button')) b.classList.toggle('active', b.dataset.theme === current());
  };
  show();
  return element;
}
