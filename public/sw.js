const CACHE_NAME = 'aiso-offline-cache-v1';

// Initial core assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/globals.css',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching core assets');
      return Promise.all(
        PRECACHE_ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn('[Service Worker] Failed to precache:', asset, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests (e.g. pages, assets, and config GET requests)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the request was successful, cache a copy and return the response
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        console.log('[Service Worker] Network failed, looking in cache for:', event.request.url);
        
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Dynamic navigate fallback to "/" for Next.js App Router subpages
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          // Return an offline-appropriate error if we have nothing cached
          return new Response(
            JSON.stringify({ error: 'Offline cached response not found' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });
      })
  );
});
