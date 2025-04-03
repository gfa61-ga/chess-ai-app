const CACHE_NAME = "chess-ai-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/stockfish.js",
  // Add any other assets you want to cache
];

// Install event: cache key assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

// Fetch event: serve from cache when available
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found, otherwise fetch from network
      return response || fetch(event.request);
    })
  );
});
