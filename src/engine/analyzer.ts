import { analysisArgs, parseAnalysis } from '../core/analysis';
import { durationInLine, timeInLine } from '../core/progress';
import type { AnalysisResult } from '../core/types';
import { extension, INPUT_DIR, type Ffmpeg } from './ffmpeg';

/**
 * Analyses one file; files are analysed one after another, as ffmpeg runs one command at a time.
 * `onProgress` gets the share read so far, from the length in ffmpeg's header and the time it has reached.
 */
export async function analyzeFile(
  ffmpeg: Ffmpeg,
  file: File,
  onProgress: (ratio: number | null) => void,
): Promise<AnalysisResult> {
  // A fixed name, so two files called the same cannot clash in the mount; the extension helps ffmpeg guess the format.
  const input = new File([file], `input${extension(file.name)}`);
  let duration: number | null = null;
  const onLine = (line: string) => {
    duration ??= durationInLine(line);
    const time = timeInLine(line);
    if (time !== null) onProgress(duration ? Math.min(1, time / duration) : null);
  };
  const { log } = await ffmpeg.run(analysisArgs(`${INPUT_DIR}/${input.name}`), [input], onLine);
  return parseAnalysis(log);
}
