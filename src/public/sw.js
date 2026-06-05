// Trading Journal Service Worker — v1
// Strategy: network-first for API, cache-first for static assets

const CACHE_NAME = "tj-v1"
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/trades",
  "/playbook",
  "/reviews",
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // Network-first for API and tRPC routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Offline — sin conexión" }), {
          headers: { "Content-Type": "application/json" },
          status: 503,
        })
      )
    )
    return
  }

  // Cache-first for static assets (JS, CSS, images)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|svg|woff2?|ico)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached ?? fetch(event.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
          return res
        })
      )
    )
    return
  }

  // Network-first with offline fallback for pages
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
