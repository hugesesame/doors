// The source of the service worker that lets the published app open again without a connection.
// At build time vite.config.ts fills in the version and the list of files (all but the page) as dist/sw.js.
// With a connection the page is always fetched, and the saved copy is used only when that fails.
// Files whose names carry a hash of their content, and the ffmpeg core, come from the saved copy.

const CACHE = 'bgm-mixer-__VERSION__';
const PAGE = self.registration.scope;
const FILES = __FILES__.map((file) => new URL(file, PAGE).href);
const TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([PAGE, ...FILES]))
      .then(() => self.skipWaiting()),
  );
});

// Drop the copies of earlier versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('bgm-mixer-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') event.respondWith(openPage(request));
  else if (FILES.includes(request.url)) event.respondWith(openFile(request));
});

async function openPage(request) {
  const cache = await caches.open(CACHE);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const fresh = await fetch(request, { signal: abort.signal });
    // On a server error, the saved copy is better if there is one.
    if (fresh.status < 500) return fresh;
    return (await cache.match(PAGE, { ignoreVary: true })) ?? fresh;
  } catch (error) {
    const saved = await cache.match(PAGE, { ignoreVary: true });
    if (saved) return saved;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Vary is ignored so module loads (sent with an Origin header) also find the saved copy;
// the names change with the content, so the wrong file cannot be served.
async function openFile(request) {
  return (await caches.match(request.url, { ignoreVary: true })) ?? fetch(request);
}
