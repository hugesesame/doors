import type { OutputFormat } from '../core/formats';

/** The browser's save dialog (showSaveFilePicker), as far as saving one file needs it. */
export type SavePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;

export type SaveResult = 'saved' | 'downloaded' | 'cancelled';

export interface SaveWays {
  /** Undefined where the browser has no save dialog (Safari, Firefox). */
  picker: SavePicker | undefined;
  download: (blob: Blob, name: string) => void;
}

/** A plain download, into the browser's downloads folder (or wherever its settings say). */
export function downloadFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // Long enough for the browser to have taken the file.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function browserSaveWays(): SaveWays {
  const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  return { picker: picker?.bind(window), download: downloadFile };
}

/**
 * Saves the finished file: where the browser can ask where to save (Chrome, Edge), it asks,
 * with the name and the file type filled in; elsewhere it downloads as before.
 * Must be called straight from the click, as the dialog needs the user's gesture.
 */
export async function saveFile(
  blob: Blob,
  name: string,
  format: OutputFormat,
  { picker, download }: SaveWays = browserSaveWays(),
): Promise<SaveResult> {
  if (!picker) {
    download(blob, name);
    return 'downloaded';
  }
  try {
    const file = await picker({
      suggestedName: name,
      types: [{ description: format.label, accept: { [format.mime]: [`.${format.ext}`] } }],
    });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'saved';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    // The dialog could not be shown (in a frame, say): a plain download still works.
    download(blob, name);
    return 'downloaded';
  }
}
