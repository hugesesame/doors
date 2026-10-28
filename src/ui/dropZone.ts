import type { App } from '../app/app';
import { t } from '../i18n';
import { h } from './dom';

/** Files dropped anywhere on the window go onto the list; the window shows it takes them while they are dragged over it. */
export function installDropZone(app: App): HTMLElement {
  const message = h('div', { class: 'drop-message' });
  const overlay = h('div', { class: 'drop-zone', hidden: true }, message);
  // dragenter / dragleave fire for every element crossed, so count them.
  let depth = 0;
  const carriesFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;
  const hide = () => {
    depth = 0;
    overlay.hidden = true;
  };

  window.addEventListener('dragenter', (e) => {
    if (!carriesFiles(e)) return;
    depth++;
    message.textContent = t('dropMessage');
    overlay.hidden = false;
  });
  window.addEventListener('dragleave', (e) => {
    if (carriesFiles(e) && --depth <= 0) hide();
  });
  // Without these the browser would open the file in place of the app.
  window.addEventListener('dragover', (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  });
  window.addEventListener('drop', (e) => {
    if (!carriesFiles(e)) return;
    e.preventDefault();
    hide();
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.length) app.addFiles(files);
  });

  return overlay;
}
