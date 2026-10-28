import type { App } from '../app/app';
import { peaksInView, type Peaks } from '../core/peaks';
import { formatDuration } from '../core/time';
import { h } from './dom';

/** The strip at the top with the time ruler and the track names. */
const LABEL_HEIGHT = 20;
const ZOOM_STEP = 1.5;
/** Zoomed right in, a pixel still covers this many seconds. */
const MIN_SECONDS_PER_PX = 0.002;
/** While playing, the view scrolls when the playhead gets this close to the right edge. */
const FOLLOW_EDGE = 0.95;
/** A press that moves less than this (px) is a click. */
const CLICK_SLOP_PX = 3;

/** Ruler steps in seconds as [labelled, minor]; the first whose labels are this far apart is used. */
const RULER_STEPS: [number, number][] = [
  [1, 0.2], [2, 0.5], [5, 1], [10, 2], [15, 5], [30, 5], [60, 10], [120, 30], [300, 60], [600, 120], [1800, 300], [3600, 600],
];
const RULER_LABEL_PX = 64;

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * The finished mix along the bottom: its waveform with each track's name and the crossfades,
 * played from wherever it is clicked; zoomed with − / + / Fit or a pinch, scrolled sideways.
 */
export function createTimeline(app: App) {
  const audio = new Audio();
  audio.preload = 'auto';

  const playButton = h('button', { type: 'button', class: 'small play', onclick: () => toggle() });
  const clock = h('span', { class: 'timeline-clock' });
  const zoomOut = h('button', { type: 'button', class: 'small', title: 'Zoom out', onclick: () => zoomBy(1 / ZOOM_STEP) }, '−');
  const zoomIn = h('button', { type: 'button', class: 'small', title: 'Zoom in', onclick: () => zoomBy(ZOOM_STEP) }, '+');
  const fit = h('button', { type: 'button', class: 'small', title: 'Show the whole mix', onclick: () => zoomFit() }, 'Fit');
  const bar = h(
    'div',
    { class: 'timeline-bar' },
    playButton,
    clock,
    h('div', { class: 'timeline-zoom' }, zoomOut, zoomIn, fit),
  );

  const canvas = h('canvas');
  const message = h('div', { class: 'timeline-message' });
  const view = h('div', { class: 'timeline-view' }, canvas, message);
  const element = h('section', { class: 'timeline' }, bar, view);
  const ctx = canvas.getContext('2d')!;

  let width = 0;
  let height = 0;
  let dpr = 1;
  /** 1 shows the whole mix; larger values show a shorter span starting at viewStart. */
  let zoom = 1;
  let viewStart = 0;
  let shown: Blob | null = null;
  let url: string | null = null;

  const mix = () => (app.mixState.kind === 'done' ? app.mixState : null);
  const duration = () => mix()?.peaks.duration ?? 0;
  const span = () => duration() / zoom;
  const maxZoom = () => Math.max(1, duration() / Math.max(1, width * MIN_SECONDS_PER_PX));
  const timeToX = (t: number) => (span() > 0 ? ((t - viewStart) / span()) * width : 0);
  const xToTime = (x: number) => (width > 0 ? viewStart + (x / width) * span() : 0);

  function clampView(): void {
    viewStart = Math.min(Math.max(viewStart, 0), Math.max(0, duration() - span()));
  }

  /** Zooms keeping `anchor` (default: the playhead, or the centre if it is off screen) in place. */
  function zoomBy(factor: number, anchor?: number): void {
    if (duration() <= 0) return;
    let time = anchor ?? audio.currentTime;
    let x = timeToX(time);
    if (anchor === undefined && (x < 0 || x > width)) {
      x = width / 2;
      time = xToTime(x);
    }
    zoom = Math.min(Math.max(zoom * factor, 1), maxZoom());
    viewStart = time - (x / width) * span();
    clampView();
    draw();
  }

  function zoomFit(): void {
    zoom = 1;
    viewStart = 0;
    draw();
  }

  function play(at?: number): void {
    if (!mix()) return;
    if (at !== undefined) audio.currentTime = Math.min(Math.max(at, 0), duration());
    void audio.play().catch(() => {});
  }

  function toggle(): void {
    if (!mix()) return;
    if (audio.paused) play();
    else audio.pause();
  }

  /** A new finished mix (or none): load it into the player and show all of it. */
  function showMix(blob: Blob | null): void {
    if (blob === shown) return;
    shown = blob;
    audio.pause();
    if (url) URL.revokeObjectURL(url);
    url = blob ? URL.createObjectURL(blob) : null;
    if (url) audio.src = url;
    else audio.removeAttribute('src');
    zoom = 1;
    viewStart = 0;
  }

  function resize(): void {
    dpr = window.devicePixelRatio || 1;
    width = view.clientWidth;
    height = view.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    zoom = Math.min(zoom, maxZoom());
    clampView();
  }

  function draw(): void {
    if (view.clientWidth !== width || view.clientHeight !== height) resize();
    const done = mix();
    const time = audio.currentTime;

    // Keep the playhead in view while it plays, but leave the view alone when only the user scrolled.
    if (done && zoom > 1 && !audio.paused) {
      const x = timeToX(time);
      if (x > width * FOLLOW_EDGE || x < 0) {
        viewStart = time - span() * (1 - FOLLOW_EDGE);
        clampView();
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cssVar('--panel');
    ctx.fillRect(0, 0, width, height);
    if (!done) return;

    const laneTop = LABEL_HEIGHT;
    const laneHeight = height - LABEL_HEIGHT;
    const middle = laneTop + laneHeight / 2;
    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
    ctx.textBaseline = 'middle';

    // The crossfades, behind the waveform.
    ctx.fillStyle = cssVar('--overlap');
    ctx.globalAlpha = 0.22;
    for (const { start, end } of done.timeline.crossfades) {
      const x1 = timeToX(start);
      ctx.fillRect(x1, laneTop, Math.max(1, timeToX(end) - x1), laneHeight);
    }
    ctx.globalAlpha = 1;

    drawWave(done.peaks, laneTop, laneHeight, middle);
    drawRuler();

    // Each track's start: a line down through the waveform and its name in the strip.
    const marker = cssVar('--marker');
    for (const segment of done.timeline.segments) {
      const x = Math.round(timeToX(segment.start)) + 0.5;
      if (x > width) break;
      ctx.strokeStyle = marker;
      ctx.beginPath();
      ctx.moveTo(x, laneTop);
      ctx.lineTo(x, height);
      ctx.stroke();
      const label = segment.name;
      const labelWidth = ctx.measureText(label).width + 8;
      if (x + labelWidth < 0) continue;
      ctx.fillStyle = marker;
      ctx.fillRect(x, 2, labelWidth, LABEL_HEIGHT - 4);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 4, LABEL_HEIGHT / 2);
    }

    const x = Math.round(timeToX(time)) + 0.5;
    ctx.strokeStyle = cssVar('--playhead');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  /** Mirrored around the middle of the lane, one column per pixel. */
  function drawWave(peaks: Peaks, top: number, laneHeight: number, middle: number): void {
    const columns = peaksInView(peaks, viewStart, span() / width, Math.ceil(width));
    const half = laneHeight / 2 - 4;
    ctx.fillStyle = cssVar('--wave');
    for (let px = 0; px < columns.length; px++) {
      const reach = Math.max(0.5, columns[px] * half);
      ctx.fillRect(px, middle - reach, 1, reach * 2);
    }
    ctx.strokeStyle = cssVar('--line');
    ctx.beginPath();
    ctx.moveTo(0, top + 0.5);
    ctx.lineTo(width, top + 0.5);
    ctx.stroke();
  }

  /** Time ticks along the name strip, behind the names. */
  function drawRuler(): void {
    if (span() <= 0) return;
    const pxPerSecond = width / span();
    const [major, minor] =
      RULER_STEPS.find(([step]) => step * pxPerSecond >= RULER_LABEL_PX) ?? RULER_STEPS[RULER_STEPS.length - 1];
    const end = viewStart + span();
    ctx.strokeStyle = ctx.fillStyle = cssVar('--muted');
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    // Count in minor steps from 0 so labelled ticks land on exact multiples.
    const perMajor = Math.round(major / minor);
    for (let i = Math.max(0, Math.floor(viewStart / minor)); i * minor <= end; i++) {
      const x = Math.round(timeToX(i * minor)) + 0.5;
      const isMajor = i % perMajor === 0;
      ctx.moveTo(x, LABEL_HEIGHT - (isMajor ? 8 : 4));
      ctx.lineTo(x, LABEL_HEIGHT);
      if (isMajor) ctx.fillText(formatDuration(i * minor), x + 3, LABEL_HEIGHT / 2 - 1);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** The track whose name label is under the pointer, so a click there plays it from its start. */
  function labelAt(x: number, y: number): number | null {
    const done = mix();
    if (!done || y > LABEL_HEIGHT) return null;
    // Later labels are drawn over earlier ones, so look from the last.
    for (const segment of [...done.timeline.segments].reverse()) {
      const left = timeToX(segment.start);
      if (x >= left && x <= left + ctx.measureText(segment.name).width + 8) return segment.start;
    }
    return null;
  }

  // A click plays from there (or from the start of the track whose name was clicked).
  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !mix()) return;
    const startX = e.clientX;
    const up = (ev: PointerEvent) => {
      view.removeEventListener('pointerup', up);
      if (Math.abs(ev.clientX - startX) > CLICK_SLOP_PX) return;
      const rect = view.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      play(labelAt(x, ev.clientY - rect.top) ?? xToTime(x));
    };
    view.addEventListener('pointerup', up);
  });

  // Trackpad: pinch (reported as ctrl+wheel) zooms at the pointer, a sideways swipe scrolls; so do ⌘ / Shift + wheel.
  view.addEventListener(
    'wheel',
    (e) => {
      if (duration() <= 0) return;
      const x = e.clientX - view.getBoundingClientRect().left;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomBy(Math.exp(-e.deltaY * 0.01), xToTime(x));
        return;
      }
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx || zoom === 1) return;
      e.preventDefault();
      viewStart += (dx / width) * span();
      clampView();
      draw();
    },
    { passive: false },
  );

  // Space plays and pauses the finished mix. Its default is held back, so a focused button (MIX!) is not pressed too.
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || document.querySelector('dialog[open]')) return;
    if (e.target instanceof HTMLSelectElement) return;
    if (!mix()) return;
    e.preventDefault();
    toggle();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && mix() && !(e.target instanceof HTMLSelectElement)) e.preventDefault();
  });

  // Redraw every frame while playing, and once on each change otherwise.
  let frame = 0;
  const tick = () => {
    showControls();
    draw();
    frame = audio.paused ? 0 : requestAnimationFrame(tick);
  };
  audio.addEventListener('play', () => (frame ||= requestAnimationFrame(tick)));
  for (const type of ['pause', 'ended', 'seeked', 'loadedmetadata']) audio.addEventListener(type, () => tick());
  new ResizeObserver(() => draw()).observe(view);
  document.addEventListener('bgm-mixer-theme', () => draw());

  function showControls(): void {
    const done = mix();
    playButton.textContent = audio.paused ? '▶' : '❚❚';
    playButton.title = audio.paused ? 'Play (Space)' : 'Pause (Space)';
    clock.textContent = done ? `${formatDuration(audio.currentTime)} / ${formatDuration(duration())}` : '--:-- / --:--';
    for (const b of [playButton, zoomOut, zoomIn, fit]) b.disabled = !done;
  }

  function update(): void {
    const state = app.mixState;
    showMix(state.kind === 'done' ? state.blob : null);
    message.hidden = state.kind === 'done';
    message.textContent =
      state.kind === 'rendering'
        ? 'Making the mix…'
        : 'The finished mix appears here. Click anywhere on it to listen from there.';
    showControls();
    draw();
  }

  return { element, update };
}
