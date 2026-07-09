// ─── Cache version: bump this string on every deployment ───────────────────────
// Using a build timestamp so it auto-increments. In production you can replace
// this with a real build ID injected at build time.
const CACHE_VERSION = 'advize-v3';
const CACHE_NAME = CACHE_VERSION;

// Only pre-cache truly static, immutable assets (icons/images — NOT HTML pages)
const STATIC_ASSETS = [
    '/favicon.ico',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/apple-touch-icon.png',
];

// Install: pre-cache static assets only (NOT html pages)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    // Take control immediately so the new SW activates without waiting
    self.skipWaiting();
});

// Activate: delete ALL old caches so stale content is purged on every deploy
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch strategy:
// - HTML/navigation requests     → Network-first (always get fresh pages)
// - API / Firebase / RSC routes  → Network-first (dynamic data)
// - Next.js immutable static     → Cache-first (hashed filenames never change)
// - Everything else              → Network-first (safe default)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and browser-extension requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // ── Next.js immutable static assets (content-hashed, safe to cache forever) ──
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((res) => {
                        if (res.ok) {
                            const clone = res.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                        return res;
                    })
            )
        );
        return;
    }

    // ── Everything else: Network-first ──────────────────────────────────────────
    // This covers: HTML pages, API routes, Firebase, Next.js RSC/data routes.
    // If the network fails we fall back to whatever is in cache.
    event.respondWith(
        fetch(request)
            .then((res) => {
                // Only cache successful non-opaque responses
                if (res.ok && res.type !== 'opaque') {
                    const clone = res.clone();
                    // Don't cache API/Firebase/dynamic responses to avoid stale data
                    const isDynamic =
                        url.pathname.startsWith('/api/') ||
                        url.hostname.includes('firebase') ||
                        url.pathname.startsWith('/_next/data/') ||
                        url.searchParams.has('_rsc');
                    if (!isDynamic) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                }
                return res;
            })
            .catch(() => caches.match(request).then(cached => cached || Response.error()))
    );
});
