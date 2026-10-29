import { APP_NAME } from '../config';
import { h } from './dom';

type Lang = 'en' | 'ja';

/** A section lists keys or terms with what they mean, and / or plain points. */
type Section = { title: string; rows?: [string, string][]; points?: string[] };

type Text = { title: string; close: string; switchTo: string; sections: Section[] };

const LANG_KEY = 'doors-help-lang';

const HELP: Record<Lang, Text> = {
  en: {
    title: 'Help',
    close: 'Close',
    switchTo: '日本語',
    sections: [
      {
        title: 'What it does',
        points: [
          `${APP_NAME} joins audio files into one: each track is brought to the same loudness, the silence at its start and end is cut, and the tracks are crossfaded in list order. It is made for background music, such as music played in a venue before an event.`,
          'With a single file it works as a converter: the file is levelled and saved in the format you choose.',
          'Everything runs in this browser. Your files are never uploaded.',
        ],
      },
      {
        title: 'How to use it',
        points: [
          'Drop audio files anywhere on the window, or press Add Files. Video files work too: their sound is used.',
          'Each file is analysed in turn, with a line along its row showing how far it has got. Drag a row to change the order; × takes a file off the list.',
          'Choose the crossfade, Loop if the file is to repeat, and the format, then press MIX (CONVERT for a single file).',
          'When it is done, the mix appears along the bottom with each track’s name and the crossfades. Click anywhere on it to move the playhead there (drag to scrub), or click a name to go to that track’s start; then play with ▶ or Space.',
          'The buttons at the bottom work as in Show Tracks: go to the start, back / forward 5 s, play / stop, previous / next track.',
          'Zoom with − / + / Fit or a pinch; swipe sideways (or Shift + wheel) to scroll. Then press Download.',
        ],
      },
      {
        title: 'What happens to the sound',
        rows: [
          ['Loudness', 'Every track is brought to -16 LUFS. A quiet track is raised by 10 dB at most, so its noise is not raised with it.'],
          ['Silence', 'Silence at the start and the end of a track (below -50 dB for 0.5 s or more) is cut, so there are no gaps.'],
          ['Crossfade', '0 to 10 s in steps of 0.1 s (slide, or type the value), with equal-power curves so the level does not dip. Next to a short track it is shortened to half of that track. The same crossfade is used between every pair of tracks: it cannot be set track by track.'],
          ['Peaks', 'A limiter keeps the peaks under -1 dBTP.'],
          ['Output', '44.1 kHz stereo: MP3 320k, WAV 16-bit, FLAC or AAC 256k (.m4a).'],
        ],
      },
      {
        title: 'Loop',
        points: [
          'Loop makes a file for playing on repeat, all through the doors-open time. Turn it on before MIX, then set your player to repeat.',
          'The file is still one pass through the list, as long as the Total shown. Nothing is repeated inside it: the player does the repeating.',
          'Its end runs straight into its start. The last track crossfades into the first, just as between any two tracks; it does not fade out to silence.',
          'For that, the first moments of the first track (as long as the crossfade: 1 s by default) move from the start of the file to its end, under the last track. So the file starts 1 s into the first track, and is 1 s shorter than without Loop. Only the very first play skips that 1 s; on repeat it is heard at the end, going into the first track.',
          'In MP3 and AAC, some players leave a tiny gap where the file repeats. WAV and FLAC loop exactly.',
          'It works for a single file too: its end runs into its own start.',
        ],
      },
      {
        title: 'Good to know',
        points: [
          'Files that cannot be used are shown in red and left out of the mix: files that cannot be read, files without sound, and files that are silent throughout.',
          'The order and the settings are locked while a mix is being made. You can still add files; they are analysed when it is done. Cancel stops the mix.',
          'After listening, you can change the order or the settings (a longer crossfade, say): the finished mix stays to compare, marked Out of date, until MIX makes it again. Discard throws it away.',
          'A file over 1 GB (a long WAV or FLAC) may not fit in the browser’s memory. MP3 is the safe choice for long mixes.',
          'Download asks where to save in Chrome and Edge. Safari and Firefox save to the downloads folder; to choose each time, turn on asking in the browser’s settings (Firefox: Always ask you where to save files; Safari: Settings → General → File download location → Ask for each download).',
          'To play the mix at the venue, use a player that repeats, such as Show Tracks. The player here is for checking the mix.',
          'After the first visit the app opens without a connection too.',
          'Works in Chrome, Edge, Safari and Firefox on a computer. Not made for phones.',
        ],
      },
      {
        title: 'Keyboard',
        rows: [
          ['Space', 'Play / stop the finished mix (it stops where it is)'],
          ['Home', 'Go to the start'],
          ['← / →,  ↑ / ↓', 'Previous / next track'],
          ['⌥ ← / ⌥ →,  , / .', 'Back / forward 5 seconds'],
          ['= / -', 'Zoom in / out'],
          ['/,  ⇧ Z', 'Show the whole mix'],
          ['F', 'Fullscreen on / off'],
          ['?', 'Open this help'],
          ['Esc', 'Close it'],
        ],
      },
      {
        title: 'About',
        points: ['Free and open source under the GPL-3.0 licence. The sound is processed by ffmpeg.wasm (FFmpeg, GPL).'],
      },
    ],
  },
  ja: {
    title: 'ヘルプ',
    close: '閉じる',
    switchTo: 'English',
    sections: [
      {
        title: 'できること',
        points: [
          `${APP_NAME} は、複数の音声ファイルを 1 本にまとめます。曲ごとに音量を揃え、頭と終わりの無音を削り、一覧の順にクロスフェードでつなぎます。イベントの開場中に流す BGM のような、背景で流す音楽づくりのためのアプリです。`,
          'ファイルが 1 つだけのときは変換ツールとして動きます。音量を揃えて、選んだ形式で書き出します。',
          '処理はすべてこのブラウザの中で行います。ファイルがどこかに送られることはありません。',
        ],
      },
      {
        title: '使い方',
        points: [
          '音声ファイルを画面のどこかにドロップするか、Add Files を押して選びます。映像ファイルも使えます（音声だけを使います）。',
          '入れたファイルは 1 つずつ解析されます。解析中の行には、進み具合が % と下の線で表示されます。行をドラッグすると順番を変えられます。× で一覧から外せます。',
          'Crossfade（クロスフェードの長さ）、Loop（繰り返し再生用にするか）、Format（出力形式）を選び、MIX を押します（ファイルが 1 つのときは CONVERT）。',
          'できあがると、画面の下にミックスの波形が、曲名とクロスフェードの区間つきで表示されます。波形をクリックするとそこに再生位置が移り（ドラッグで動かせます）、曲名をクリックするとその曲の頭に移ります。▶ か Space で再生します。',
          '画面下のボタンは Show Tracks と同じです。先頭へ、5 秒戻る / 進む、再生 / 停止、前 / 次の曲。',
          '− / + / Fit またはピンチで拡大・縮小し、横スワイプ（または Shift + ホイール）でスクロールします。確認できたら Download を押します。',
        ],
      },
      {
        title: '音に対して行うこと',
        rows: [
          ['音量', 'すべての曲を -16 LUFS に揃えます。静かな曲を上げるのは最大 10 dB までです。録音のノイズまで持ち上げないためです。'],
          ['無音', '曲の頭と終わりにある無音（-50 dB 以下が 0.5 秒以上）を削り、曲間に間が空かないようにします。'],
          ['クロスフェード', '0〜10 秒を 0.1 秒刻みで設定できます（スライダーか、数字の入力）。重なっている間も音量がへこまない形（equal-power）でつなぎます。短い曲の前後では、その曲の長さの半分まで短くします。すべての曲間で同じ長さを使い、曲ごとに変えることはできません。'],
          ['ピーク', 'リミッターで、ピークを -1 dBTP 以下に抑えます。'],
          ['出力', '44.1 kHz ステレオ。MP3 320k、WAV 16 bit、FLAC、AAC 256k（.m4a）から選べます。'],
        ],
      },
      {
        title: 'ループ（Loop）',
        points: [
          'Loop は、開場中ずっとリピート再生で流しっぱなしにするためのファイルを作ります。MIX の前にオンにして、プレーヤーをリピート再生にしてください。',
          'ファイルの中身は一覧の 1 周ぶんで、長さは画面の Total のとおりです。ファイルの中で繰り返しているわけではなく、繰り返すのはプレーヤーです。',
          'ファイルの終わりは、頭へそのままつながります。最後の曲が最初の曲へ、ほかの曲間と同じようにクロスフェードでつながります。無音へフェードアウトして終わることはありません。',
          'そのために、最初の曲の頭（クロスフェードの長さぶん。初期値なら 1 秒）を、ファイルの先頭から最後へ移し、最後の曲と重ねます。なので、ファイルは最初の曲の 1 秒目から始まり、Loop がオフのときより 1 秒短くなります。その 1 秒が聞こえないのは最初の 1 回だけで、リピートの 2 周目からは、ファイルの最後で最初の曲へつながるところで聞こえます。',
          'MP3 と AAC では、プレーヤーによって、繰り返しの継ぎ目にごく短い隙間が入ることがあります。WAV と FLAC なら継ぎ目なしでつながります。',
          'ファイルが 1 つのときも使えます。その曲の終わりが、自分の頭へつながります。',
        ],
      },
      {
        title: '知っておくと便利なこと',
        points: [
          '使えないファイルは赤字で表示され、ミックスから外されます。読めないファイル、音声が入っていないファイル、最初から最後まで無音のファイルです。',
          'ミックスを作っている間は、曲順と設定を変えられません。ファイルの追加はでき、ミックスが終わってから解析します。Cancel で中止できます。',
          '聞いたあとで曲順や設定（クロスフェードを長くするなど）を変えても、できあがったミックスは聞き比べられるように残ります。Out of date と表示され、MIX を押すと作り直されます。Discard で削除できます。',
          '1 GB を超えるファイル（長い WAV や FLAC）は、ブラウザのメモリに収まらないことがあります。長いミックスは MP3 が安全です。',
          'Download を押すと、Chrome と Edge では保存先を聞かれます。Safari と Firefox ではダウンロードフォルダに保存されます。毎回選びたいときは、ブラウザの設定で保存先を確認するようにしてください（Firefox:「ファイルごとに保存先を指定する」、Safari: 設定 → 一般 → ファイルのダウンロード先 →「ダウンロードごとに確認」）。',
          '会場で流すときは、リピート再生できるプレーヤー（Show Tracks など）を使ってください。この画面のプレーヤーは、ミックスの確認用です。',
          '一度開いたあとは、ネットにつながっていなくても使えます。',
          'PC の Chrome、Edge、Safari、Firefox で動きます。スマートフォンは対象外です。',
        ],
      },
      {
        title: 'キーボード',
        rows: [
          ['Space', 'できあがったミックスの再生 / 停止（その位置で止まります）'],
          ['Home', '先頭へ'],
          ['← / →,  ↑ / ↓', '前 / 次の曲へ'],
          ['⌥ ← / ⌥ →,  , / .', '5 秒戻る / 進む'],
          ['= / -', '拡大 / 縮小'],
          ['/,  ⇧ Z', 'ミックス全体を表示'],
          ['F', 'フルスクリーンの切り替え'],
          ['?', 'このヘルプを開く'],
          ['Esc', '閉じる'],
        ],
      },
      {
        title: 'このアプリについて',
        points: ['GPL-3.0 ライセンスの、無料のオープンソースソフトウェアです。音の処理には ffmpeg.wasm（FFmpeg、GPL）を使っています。'],
      },
    ],
  },
};

function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'ja' ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

/** The help dialog: English first, with a switch to Japanese that is remembered in this browser. */
export function createHelp() {
  const dialog = h('dialog', { class: 'help' });
  let lang = loadLang();

  function render(): void {
    const text = HELP[lang];
    const switchLang = h(
      'button',
      {
        type: 'button',
        class: 'small',
        onclick: () => {
          lang = lang === 'en' ? 'ja' : 'en';
          try {
            localStorage.setItem(LANG_KEY, lang);
          } catch {
            // Not remembering the language is fine.
          }
          render();
        },
      },
      text.switchTo,
    );
    dialog.lang = lang;
    dialog.replaceChildren(
      h(
        'form',
        { class: 'dialog-body', method: 'dialog' },
        h('div', { class: 'help-head' }, h('h2', {}, text.title), switchLang),
        ...text.sections.flatMap((section) => [
          h('h3', {}, section.title),
          section.rows
            ? h(
                'dl',
                { class: 'help-rows' },
                ...section.rows.flatMap(([key, what]) => [h('dt', {}, key), h('dd', {}, what)]),
              )
            : null,
          section.points ? h('ul', { class: 'help-points' }, ...section.points.map((p) => h('li', {}, p))) : null,
        ]),
        h('div', { class: 'actions' }, h('button', { value: 'close' }, text.close)),
      ),
    );
  }

  function open(): void {
    if (dialog.open) return;
    render();
    dialog.showModal();
  }

  // "?" (ui/keyboard.ts) opens it; Esc closes it, as any modal dialog.
  return { element: dialog, open };
}
