// Manara OS service worker.
//
// Scope is deliberately narrow: this is a multi-tenant SaaS app, so anything
// that touches account data must always hit the network. The service worker
// only makes the app *installable* and keeps it from going blank on a flaky
// connection — it is not an offline-data feature.
//
// - Navigations (HTML pages): network-first, falling back to a cached copy or
//   the offline page. Never served stale-first, so a signed-out user is never
//   shown another workspace's cached page.
// - Static, hashed build assets (/_next/static/*): cache-first. These are
//   content-hashed by Next.js, so a cached copy is never wrong.
// - Everything else — /api/*, auth routes, RSC data requests — bypassed
//   entirely and left to the network.

const VERSION = 'v1';
const STATIC_CACHE = `manara-static-${VERSION}`;
const PAGE_CACHE = `manara-pages-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('manara-') && key !== STATIC_CACHE && key !== PAGE_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiOrAuth(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/data/')
  );
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiOrAuth(url)) return; // let the network handle it, uncached

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
        }
      })(),
    );
  }
});
