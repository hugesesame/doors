import { analysisArgs, parseAnalysis } from '../core/analysis';
import type { AnalysisResult } from '../core/types';
import { extension, INPUT_DIR, type Ffmpeg } from './ffmpeg';

/** Analyses one file; files are analysed one after another, as ffmpeg runs one command at a time. */
export async function analyzeFile(ffmpeg: Ffmpeg, file: File): Promise<AnalysisResult> {
  // A fixed name, so two files called the same cannot clash in the mount; the extension helps ffmpeg guess the format.
  const input = new File([file], `input${extension(file.name)}`);
  const { log } = await ffmpeg.run(analysisArgs(`${INPUT_DIR}/${input.name}`), [input]);
  return parseAnalysis(log);
}
