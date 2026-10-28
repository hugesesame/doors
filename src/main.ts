import './style.css';
import { App } from './app/app';
import { localStorageOrNull, storageSettingsStore } from './app/settingsStore';
import { createEngine } from './engine';
import { onLangChange } from './i18n';
import { byId, h } from './ui/dom';
import { installDropZone } from './ui/dropZone';
import { createFooter } from './ui/footer';
import { createHeader } from './ui/header';
import { createMixPanel } from './ui/mixPanel';
import { createSettingsPanel } from './ui/settingsPanel';
import { createTrackList } from './ui/trackList';

const app = new App(createEngine(), storageSettingsStore(localStorageOrNull()), () => new Date());

const header = createHeader(app);
const trackList = createTrackList(app);
const settings = createSettingsPanel(app);
const mixPanel = createMixPanel(app);
const footer = createFooter(app);

byId('app').replaceChildren(
  header.element,
  h('main', { class: 'main' }, trackList.element, h('aside', { class: 'panel side' }, settings.element, mixPanel.element)),
  footer.element,
  installDropZone(app),
);

const update = () => {
  header.update();
  trackList.update();
  settings.update();
  mixPanel.update();
  footer.update();
};
app.onChange(update);
onLangChange(update);
update();

void app.start();
