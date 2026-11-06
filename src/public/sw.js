// Trading Journal Service Worker — v3
// Offline navigation shows a public shell. Never persist authenticated HTML.
const CACHE_NAME = "tj-v3"
const STATIC_ASSETS = ["/offline.html", "/manifest.json"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || event.request.method !== "GET") return

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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return await cache.match("/offline.html") ?? new Response(
          "Sin conexión. Vuelve a intentarlo cuando recuperes la conexión.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        )
      })
    )
    return
  }

  // Only immutable build assets are eligible for runtime caching. Application
  // routes (including RSC requests) and user images always go to the network.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok && !response.redirected && !response.headers.get("Content-Type")?.includes("text/html")) {
          await cache.put(event.request, response.clone())
        }
        return response
      })
    )
  }
})
