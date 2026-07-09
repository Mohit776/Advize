// ─── Cache version: bump this string on every deployment ───────────────────────
const CACHE_VERSION = 'advize-v4';
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
// - Navigation requests           → Network-only (let the browser handle failures natively)
// - API / Firebase / RSC routes    → Network-only (dynamic data, never cache)
// - Next.js immutable static      → Cache-first (hashed filenames never change)
// - Everything else               → Network-first with cache fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and browser-extension requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // ── Navigation requests (HTML pages) ─────────────────────────────────────
    // DO NOT intercept these. Let the browser handle network failures natively
    // with its own error page. Intercepting navigations and returning
    // Response.error() or undefined causes the "Application error" crash.
    if (request.mode === 'navigate') return;

    // ── Skip API, Firebase, and dynamic data routes entirely ─────────────────
    const isDynamic =
        url.pathname.startsWith('/api/') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.pathname.startsWith('/_next/data/') ||
        url.searchParams.has('_rsc');
    if (isDynamic) return;

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

    // ── Everything else: Network-first with safe cache fallback ──────────────
    event.respondWith(
        fetch(request)
            .then((res) => {
                // Only cache successful, non-opaque responses
                if (res.ok && res.type !== 'opaque') {
                    const clone = res.clone();
                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put(request, clone))
                        .catch(() => {}); // Ignore Cache.put() errors (quota, etc.)
                }
                return res;
            })
            .catch(() =>
                caches.match(request).then((cached) => {
                    // Return cached version if available, otherwise let the browser
                    // handle the failure naturally (don't return Response.error()).
                    if (cached) return cached;
                    // Return a minimal 503 response instead of crashing
                    return new Response('Service Unavailable', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'Content-Type': 'text/plain' },
                    });
                })
            )
    );
});
