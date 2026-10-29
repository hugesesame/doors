import { describe, expect, it, vi } from 'vitest';
import { FORMATS } from '../src/core/formats';
import { saveFile, type SavePicker } from '../src/ui/save';

const blob = new Blob(['mix']);

/** A save dialog that hands back a file which records what is written to it. */
function picker() {
  const written: unknown[] = [];
  const open: SavePicker = vi.fn(async () => ({
    createWritable: async () => ({
      write: async (data: unknown) => void written.push(data),
      close: async () => {},
    }),
  }));
  return { open, written };
}

describe('saveFile', () => {
  it('asks where to save where the browser can, with the name and the file type filled in', async () => {
    const { open, written } = picker();
    const download = vi.fn();
    expect(await saveFile(blob, 'mix-20261029-0930.mp3', FORMATS.mp3, { picker: open, download })).toBe('saved');
    expect(open).toHaveBeenCalledWith({
      suggestedName: 'mix-20261029-0930.mp3',
      types: [{ description: 'MP3 320k', accept: { 'audio/mpeg': ['.mp3'] } }],
    });
    expect(written).toEqual([blob]);
    expect(download).not.toHaveBeenCalled();
  });

  it('downloads as before where the browser cannot ask', async () => {
    const download = vi.fn();
    expect(await saveFile(blob, 'Opening.flac', FORMATS.flac, { picker: undefined, download })).toBe('downloaded');
    expect(download).toHaveBeenCalledWith(blob, 'Opening.flac');
  });

  it('does nothing when the dialog is cancelled', async () => {
    const download = vi.fn();
    const open: SavePicker = vi.fn(async () => {
      throw new DOMException('The user aborted a request.', 'AbortError');
    });
    expect(await saveFile(blob, 'mix.mp3', FORMATS.mp3, { picker: open, download })).toBe('cancelled');
    expect(download).not.toHaveBeenCalled();
  });

  it('falls back to a download when the dialog cannot be shown', async () => {
    const download = vi.fn();
    const open: SavePicker = vi.fn(async () => {
      throw new DOMException('Not allowed here.', 'SecurityError');
    });
    expect(await saveFile(blob, 'mix.mp3', FORMATS.mp3, { picker: open, download })).toBe('downloaded');
    expect(download).toHaveBeenCalledWith(blob, 'mix.mp3');
  });
});
