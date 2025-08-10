// Simple offline-first cache
const CACHE_NAME = 'presupuestos-cache-v1'
const ASSETS = [
  '/',
  '/placeholder-logo.png',
  '/placeholder-logo.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // Only GET
  if (req.method !== 'GET') return
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          // Clone and store in cache for same-origin
          if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
            const resClone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    }),
  )
})


