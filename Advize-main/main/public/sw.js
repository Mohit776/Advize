const CACHE_NAME = 'advize-v2';

// App shell — pages and assets to pre-cache on install
const APP_SHELL = [
    '/',
    '/campaigns',
    '/favicon.ico',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/apple-touch-icon.png',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch strategy:
// - API / firebase / next data → Network first, fallback to cache
// - Everything else → Cache first, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and browser-extension requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // Network-first for API, Firebase, Next.js data routes
    const isNetworkFirst =
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('firebase') ||
        url.pathname.startsWith('/_next/data/') ||
        url.searchParams.has('_rsc');

    if (isNetworkFirst) {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    // Cache a clone of successful responses
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(request).then(
            (cached) =>
                cached ||
                fetch(request).then((res) => {
                    if (res.ok && url.pathname.startsWith('/_next/static/')) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return res;
                })
        )
    );
});
