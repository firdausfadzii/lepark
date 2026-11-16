// Minimal pass-through Service Worker for PWA installability.
// Intentionally does NOT cache assets or handle offline states so that
// network/offline errors fall through to the browser's native error page.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle all network requests and offline errors natively.
});
