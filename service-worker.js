// public/service-worker.js

const CACHE_NAME = "chess-ai-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/stockfish.js",
  "/service-worker.js",
  // Add other assets you want to cache (e.g., CSS, images)
];

self.addEventListener("install", (event) => {
  // Perform install steps: open a cache and add specified assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener("activate", (event) => {
  // Optionally clear out old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Respond with cached assets when available, otherwise perform network fetch
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
