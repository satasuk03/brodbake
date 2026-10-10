/* BrodBake repeat-visit cache (Phase 3, docs/PERF.md). Hand-written, deliberately tiny:
 * - hashed build assets (assets/name-HASH.ext) are immutable → cache-first, filled on first use;
 * - everything else (index.html, manifest, og image) goes to the network untouched, so a deploy is live on the next load;
 * - old entries are trimmed (keeps the newest 120), old cache versions are dropped on activate. */
const CACHE = 'brodbake-assets-v1';
const HASHED = /\/assets\/[^/]+-[\w-]{8}\.(?:js|css|woff2?|png|jpg|webp|svg|json)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !HASHED.test(url.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type !== 'opaque') {
      void c.put(req, res.clone()).then(() => c.keys()).then((ks) => Promise.all(ks.slice(0, Math.max(0, ks.length - 120)).map((k) => c.delete(k))));
    }
    return res;
  }));
});
