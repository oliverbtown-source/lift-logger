/* Lift Logger — shell cache.
 *
 * Scope is whatever directory this file is served from, which on GitHub Pages
 * is /lift-logger/. It caches the app shell only. It never touches
 * script.google.com: those are the log writes, and a cached POST response or a
 * cached bootstrap would be a lie about what is on the sheet.
 *
 * Strategy is stale-while-revalidate — the cached shell paints immediately and
 * a fresh copy is fetched underneath, so a new deploy shows up on the next
 * open instead of blocking this one. Bump CACHE when you want to be certain
 * an old copy is evicted.
 */
const CACHE = 'liftlogger-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // the endpoint is never cached

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);           // offline: whatever we already have
        return hit || net;             // cached first, network underneath
      })
    )
  );
});
