// Load Workbox from the CDN using importScripts
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.3/workbox-sw.js');

if (workbox) {
  console.log("Workbox is loaded");

  const appVersion = "v1.0.6"; // update this when your app version changes

  // Precache assets
  workbox.precaching.precacheAndRoute([
    { url: './', revision: appVersion },
    { url: './index.html', revision: appVersion },
    { url: './stockfish.js', revision: appVersion }
  ]);

  // Cache JavaScript files with a CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script',
    new workbox.strategies.CacheFirst({
      cacheName: 'js-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Cache CSS files with a CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style',
    new workbox.strategies.CacheFirst({
      cacheName: 'css-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Cache images with a CacheFirst strategy
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Use NetworkFirst for navigations
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'html-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          //maxAgeSeconds: 24 * 60 * 60, // 1 day
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );
} else {
  console.error("Workbox didn't load");
}
