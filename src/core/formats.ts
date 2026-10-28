export type FormatId = 'mp3' | 'wav' | 'flac' | 'aac';

export interface OutputFormat {
  id: FormatId;
  label: string;
  ext: string;
  mime: string;
  /** ffmpeg's encoder options. */
  codec: string[];
  /** About how many bytes one second of the output takes. */
  bytesPerSecond: number;
}

const WAV_BYTES_PER_SECOND = 44100 * 2 * 2;

/** The output formats, in the order the menu lists them; MP3 is the default. */
export const FORMATS: Record<FormatId, OutputFormat> = {
  mp3: {
    id: 'mp3',
    label: 'MP3 320k',
    ext: 'mp3',
    mime: 'audio/mpeg',
    codec: ['-c:a', 'libmp3lame', '-b:a', '320k'],
    bytesPerSecond: 320_000 / 8,
  },
  wav: {
    id: 'wav',
    label: 'WAV',
    ext: 'wav',
    mime: 'audio/wav',
    codec: ['-c:a', 'pcm_s16le'],
    bytesPerSecond: WAV_BYTES_PER_SECOND,
  },
  flac: {
    id: 'flac',
    label: 'FLAC',
    ext: 'flac',
    mime: 'audio/flac',
    codec: ['-c:a', 'flac'],
    // Music usually packs to about 60 % of WAV.
    bytesPerSecond: WAV_BYTES_PER_SECOND * 0.6,
  },
  aac: {
    id: 'aac',
    label: 'AAC 256k',
    ext: 'm4a',
    mime: 'audio/mp4',
    codec: ['-c:a', 'aac', '-b:a', '256k'],
    bytesPerSecond: 256_000 / 8,
  },
};

export const DEFAULT_FORMAT: FormatId = 'mp3';

/** About how big the output of `seconds` will be. */
export function estimateBytes(format: OutputFormat, seconds: number): number {
  return Math.round(format.bytesPerSecond * seconds);
}
