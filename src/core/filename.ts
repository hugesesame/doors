import type { OutputFormat } from './formats';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The download's name: a single track keeps its own name, as a converter would;
 * a mix is named by when it was made, such as "mix-20261028-0905.mp3". A file made
 * with Loop ends in "-loop".
 */
export function outputName(sourceNames: readonly string[], format: OutputFormat, now: Date, loop = false): string {
  const suffix = `${loop ? '-loop' : ''}.${format.ext}`;
  if (sourceNames.length === 1) {
    const name = sourceNames[0];
    // A dot at the very start begins a hidden file's name, not an extension.
    const dot = name.lastIndexOf('.');
    return `${dot > 0 ? name.slice(0, dot) : name}${suffix}`;
  }
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `mix-${date}-${time}${suffix}`;
}
