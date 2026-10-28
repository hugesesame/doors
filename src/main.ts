import './style.css';
import { App } from './app/app';
import { Player } from './app/player';
import { localStorageOrNull, storageSettingsStore } from './app/settingsStore';
import { createEngine } from './engine';
import { enableOffline } from './offline';
import { byId, h } from './ui/dom';
import { installDropZone } from './ui/dropZone';
import { createFooter } from './ui/footer';
import { createHeader } from './ui/header';
import { createHelp } from './ui/help';
import { installKeyboard } from './ui/keyboard';
import { createMixPanel } from './ui/mixPanel';
import { createSettingsPanel } from './ui/settingsPanel';
import { createTimeline } from './ui/timeline';
import { createTrackList } from './ui/trackList';
import { createTransport } from './ui/transport';

const app = new App(createEngine(), storageSettingsStore(localStorageOrNull()), () => new Date());

// Plays the finished mix, whichever it is now.
const player = new Player(
  () => {
    const state = app.mixState;
    if (state.kind !== 'done') return null;
    return { blob: state.blob, duration: state.peaks.duration, starts: state.timeline.segments.map((s) => s.start) };
  },
  (onChange) => app.onChange(onChange),
);

const help = createHelp();
const header = createHeader(app, help.open);
const trackList = createTrackList(app);
const settings = createSettingsPanel(app);
const mixPanel = createMixPanel(app);
const timeline = createTimeline(app, player);
const transport = createTransport(player);
const footer = createFooter(app, transport.element);

byId('app').replaceChildren(
  header.element,
  h('main', { class: 'main' }, trackList.element, h('aside', { class: 'panel side' }, settings.element, mixPanel.element)),
  timeline.element,
  footer.element,
  help.element,
  installDropZone(app),
);

const update = () => {
  header.update();
  trackList.update();
  settings.update();
  mixPanel.update();
  timeline.update();
  footer.update();
};
app.onChange(update);
update();
installKeyboard(player, timeline.zoom, help.open);

// Closing the tab would throw away a mix that is still being made.
window.addEventListener('beforeunload', (e) => {
  if (app.rendering) e.preventDefault();
});

enableOffline(footer.showOfflineReady);
void app.start();
