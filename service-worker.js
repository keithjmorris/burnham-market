/* ═══════════════════════════════════════════════
   BURNHAM MARKET GUIDE — service-worker.js
   Strategy:
   - App shell (HTML/CSS/JS): cache first
   - Data (data.json): network first, cache fallback
   - Images: cache first (they rarely change)
   ═══════════════════════════════════════════════ */

const CACHE_VERSION = 'bm-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

// ── INSTALL: cache the app shell ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ──────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ── DATA: always try network first, fall back to cache ──
  // This ensures shops/restaurants/facilities are always fresh
  if (url.includes('data.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Save a fresh copy to cache as fallback
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline — serve cached data with a console note
          console.log('Offline: serving cached data.json');
          return caches.match(event.request);
        })
    );
    return;
  }

  // ── IMAGES: cache first (they don't change often) ──
  if (url.includes('burnham-market-images')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // ── APP SHELL: cache first ──────────────────
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});