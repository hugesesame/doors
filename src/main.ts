import './style.css';
import { APP_NAME, APP_VERSION } from './config';
import { FORMATS } from './core/formats';
import { makePlan, type PlanInput } from './core/plan';
import { analyzeFile } from './engine/analyzer';
import { Ffmpeg } from './engine/ffmpeg';
import { render } from './engine/renderer';

// A temporary page for trying the engine in the browser; the real interface replaces it.
const root = document.getElementById('app')!;
root.innerHTML = `
  <div style="padding:16px;display:grid;gap:8px;max-width:720px">
    <div>${APP_NAME} v${APP_VERSION} — engine check</div>
    <input id="files" type="file" multiple />
    <div><button id="mix">Mix</button> <button id="stop">Stop</button></div>
    <pre id="out" style="white-space:pre-wrap;font:12px var(--mono)"></pre>
    <audio id="player" controls></audio>
  </div>`;

const ffmpeg = new Ffmpeg();
const out = root.querySelector<HTMLPreElement>('#out')!;
const print = (text: string) => (out.textContent += `${text}\n`);
const files = new Map<string, File>();
const inputs: PlanInput[] = [];
const logs: Record<string, string> = {};
Object.assign(window, { engineCheck: { ffmpeg, files, inputs, logs } });

root.querySelector<HTMLInputElement>('#files')!.addEventListener('change', async (e) => {
  for (const file of (e.target as HTMLInputElement).files ?? []) {
    const id = `${inputs.length}:${file.name}`;
    files.set(id, file);
    const input: PlanInput = { id, result: null };
    inputs.push(input);
    const t = performance.now();
    input.result = await analyzeFile(ffmpeg, file);
    print(`${id} ${((performance.now() - t) / 1000).toFixed(1)}s ${JSON.stringify(input.result)}`);
  }
});

root.querySelector('#mix')!.addEventListener('click', async () => {
  const plan = makePlan(inputs, 4);
  print(`plan ${JSON.stringify(plan)}`);
  const t = performance.now();
  try {
    const blob = await render(ffmpeg, plan, files, FORMATS.mp3, (p) => {
      out.dataset.progress = JSON.stringify(p);
    });
    print(`mix ${blob.size} bytes in ${((performance.now() - t) / 1000).toFixed(1)}s`);
    root.querySelector<HTMLAudioElement>('#player')!.src = URL.createObjectURL(blob);
  } catch (error) {
    print(`mix failed: ${(error as Error).message}`);
  }
});

root.querySelector('#stop')!.addEventListener('click', () => ffmpeg.stop());

ffmpeg.load().then(
  () => print('ffmpeg loaded'),
  (error: unknown) => print(`ffmpeg failed to load: ${(error as Error).message}`),
);
