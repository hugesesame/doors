import { renderArgs } from '../core/filtergraph';
import type { OutputFormat } from '../core/formats';
import type { Plan } from '../core/plan';
import { estimateProgress, timeInLine, type Progress } from '../core/progress';
import { extension, INPUT_DIR, type Ffmpeg } from './ffmpeg';

/** Lines of ffmpeg's log kept with a failed render, for the error details. */
const LOG_TAIL_LINES = 50;

export class RenderError extends Error {
  constructor(readonly logTail: string) {
    super('ffmpeg could not make the file');
  }
}

/** Makes the planned mix as a file; `files` holds each track's file by its id. */
export async function render(
  ffmpeg: Ffmpeg,
  plan: Plan,
  files: ReadonlyMap<string, File>,
  format: OutputFormat,
  onProgress: (progress: Progress) => void,
): Promise<Blob> {
  // Numbered names, so two files called the same cannot clash in the mount.
  const inputs = plan.tracks.map((t, i) => {
    const file = files.get(t.id);
    if (!file) throw new Error(`No file for track ${t.id}`);
    return new File([file], `t${i}${extension(file.name)}`);
  });
  const pathOf = new Map(plan.tracks.map((t, i) => [t.id, `${INPUT_DIR}/${inputs[i].name}`]));
  const output = `/mix.${format.ext}`;

  const started = performance.now();
  const onLine = (line: string) => {
    const done = timeInLine(line);
    if (done !== null) onProgress(estimateProgress(done, plan.total, (performance.now() - started) / 1000));
  };
  const { code, log } = await ffmpeg.run(renderArgs(plan, (id) => pathOf.get(id)!, format, output), inputs, onLine);
  if (code !== 0) throw new RenderError(log.split('\n').slice(-LOG_TAIL_LINES).join('\n'));

  const data = await ffmpeg.take(output);
  return new Blob([data as Uint8Array<ArrayBuffer>], { type: format.mime });
}
