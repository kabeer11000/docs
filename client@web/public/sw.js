// Retired service worker. The old one served cached scripts first, which could pin
// browsers to stale bundles, and cached authenticated responses. Installs of the old
// worker fetch this file on their next update check; it clears every cache and
// unregisters itself. Keep it deployed for a while so existing installs pick it up.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })(),
  );
});
