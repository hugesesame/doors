/**
 * Registers the service worker that keeps a copy of the app, ffmpeg included, for use
 * without a connection (built from src/sw.js), and calls `onReady` once that copy is stored.
 * Only in the built app: on the dev server a saved copy would hide code changes.
 */
export function enableOffline(onReady: () => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Without the copy the app still works online.
  });
  // The worker only becomes active once everything is saved.
  void navigator.serviceWorker.ready.then(onReady);
}
