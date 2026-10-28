export type Lang = 'en' | 'ja';

const en = {
  tracks: 'Tracks',
  addFiles: 'Add Files',
  colName: 'Name',
  colLength: 'Length',
  colLoudness: 'Loudness',
  emptyTitle: 'Drop audio files here',
  emptyHint:
    'They are levelled and crossfaded into one file, in list order. Your files stay on this computer: nothing is uploaded.',
  dropMessage: 'Drop to add to the list',
  remove: 'Remove from the list',
  dragHint: 'Drag to reorder',
  analysing: 'Analysing…',
  waiting: 'Waiting',
  unreadable: 'Cannot read this file',
  noAudio: 'No audio in this file',
  silent: 'Silent throughout',
  settings: 'Settings',
  crossfade: 'Crossfade',
  seconds: '{n} s',
  format: 'Format',
  tooBig: 'Over 1 GB: this may not fit in the browser’s memory. MP3 is recommended.',
  mix: 'MIX',
  convert: 'CONVERT',
  cancel: 'Cancel',
  starting: 'Starting…',
  progress: '{percent}%',
  timeLeft: 'about {time} left',
  minutes: '{n} min',
  secondsLeft: '{n} s',
  done: 'Done',
  download: 'Download',
  failed: 'Could not make the file.',
  details: 'Details',
  loadingEngine: 'Loading ffmpeg…',
  engineFailed: 'Could not load ffmpeg. Check your connection and try again.',
  retry: 'Retry',
  summary: '{count} tracks',
  summaryOne: '1 track',
  total: 'Total',
};

type Key = keyof typeof en;

const ja: Record<Key, string> = {
  tracks: '曲',
  addFiles: 'ファイルを追加',
  colName: 'ファイル名',
  colLength: '長さ',
  colLoudness: '音量',
  emptyTitle: 'ここに音声ファイルをドロップ',
  emptyHint: '一覧の順に音量を揃え、クロスフェードでつないで 1 本のファイルにします。ファイルはこの PC の外に送られません。',
  dropMessage: 'ドロップして一覧に追加',
  remove: '一覧から外す',
  dragHint: 'ドラッグで並べ替え',
  analysing: '解析中…',
  waiting: '待機中',
  unreadable: '読めないファイル',
  noAudio: '音声がありません',
  silent: '無音です',
  settings: '設定',
  crossfade: 'クロスフェード',
  seconds: '{n} 秒',
  format: '出力形式',
  tooBig: '1 GB を超えるため、ブラウザのメモリに収まらないおそれがあります。MP3 をおすすめします。',
  mix: 'MIX',
  convert: '変換',
  cancel: '中止',
  starting: '準備中…',
  progress: '{percent}%',
  timeLeft: '残り約 {time}',
  minutes: '{n} 分',
  secondsLeft: '{n} 秒',
  done: '完成',
  download: 'ダウンロード',
  failed: 'ファイルを作れませんでした。',
  details: '詳細',
  loadingEngine: 'ffmpeg を読み込み中…',
  engineFailed: 'ffmpeg を読み込めませんでした。接続を確認して、もう一度お試しください。',
  retry: '再試行',
  summary: '{count} 曲',
  summaryOne: '1 曲',
  total: '合計',
};

const dictionaries: Record<Lang, Record<Key, string>> = { en, ja };
const STORAGE_KEY = 'bgm-mixer-lang';

/** English unless Japanese was chosen in this browser before. */
function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ja' ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

let lang: Lang = readLang();
const listeners: (() => void)[] = [];
document.documentElement.lang = lang;

export function t(key: Key, params?: Record<string, string | number>): string {
  return dictionaries[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? ''));
}

export function currentLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The page still switches; it just starts in English next time.
  }
  for (const listener of listeners) listener();
}

export function onLangChange(listener: () => void): void {
  listeners.push(listener);
}
