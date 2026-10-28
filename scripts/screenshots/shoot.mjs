// Takes the README screenshots (screenshots/main.png in Day mode, night.png in Night mode)
// from the sample tracks of make-media.mjs, in Chrome. Run the dev server first;
// pass another URL to shoot elsewhere.
//   node scripts/screenshots/make-media.mjs
//   node scripts/screenshots/shoot.mjs [http://localhost:5173/]
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const media = join(here, 'media');
const out = join(here, '..', '..', 'screenshots');
const url = process.argv[2] ?? 'http://localhost:5173/';
/** In the order make-media.mjs lists them. */
const TRACKS = ['Morning Lobby.mp3', 'Soft Arrivals.wav', 'Golden Hour.flac', 'Doors Open.mp3', 'Last Call.m4a'];
/** Long enough for the crossfades to show in the waveform. */
const CROSSFADE = '3';
/** Where the playhead sits, as a share of the waveform's width. */
const PLAYHEAD_AT = 0.44;

/** Playwright from the project if it is installed there, else the global one. */
async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return createRequire(join(root, 'noop.js'))('playwright');
  }
}

const missing = TRACKS.filter((t) => !readdirSync(media).includes(t));
if (missing.length) throw new Error(`Run make-media.mjs first (missing ${missing.join(', ')})`);
mkdirSync(out, { recursive: true });

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ channel: 'chrome' });
// A fresh profile: Day mode and the default settings, as a first visit.
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(url);
await page.locator('.mix-note').waitFor({ state: 'hidden' });

await page.locator('input[type=file]').setInputFiles(TRACKS.map((t) => join(media, t)));
await page.locator('.setting-number').fill(CROSSFADE);
await page.locator('.setting-number').press('Enter');
await page.locator('.go:not([disabled])').waitFor({ timeout: 120_000 });
await page.locator('.go').click();
await page.locator('.result').waitFor({ state: 'visible', timeout: 120_000 });

// The playhead part way in, as while checking the mix; the mouse out of the way.
const wave = await page.locator('.timeline-view').boundingBox();
await page.mouse.click(wave.x + wave.width * PLAYHEAD_AT, wave.y + wave.height * 0.6);
await page.mouse.move(wave.x + wave.width * 0.98, wave.y - 200);
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'main.png') });

await page.locator('.segmented button', { hasText: 'Night' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'night.png') });

await browser.close();
console.log(`Saved to ${out}`);
