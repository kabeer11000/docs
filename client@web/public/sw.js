// Service Worker for Kabeer's Docs PWA

const CACHE_NAME = 'kabeers-docs-v1';
const STATIC_CACHE_NAME = 'static-v1';
const RUNTIME_CACHE_NAME = 'runtime-v1';

// URLs to cache for offline functionality
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-1024x1024.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache critical static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Opened static cache');
        return cache.addAll(urlsToCache);
      }),
      // Skip waiting to allow immediate activation
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - implement different strategies for different resources
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and cross-origin requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle different URL patterns with different strategies
  const { request } = event;
  const url = new URL(request.url);

  // For static assets (images, scripts, stylesheets)
  if (url.origin === location.origin) {
    if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch from network and cache it
          return fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              // Clone the response to save in cache
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          }).catch(() => {
            // If both network and cache fail, return fallback
            return caches.match('/favicon.ico');
          });
        })
      );
    } else {
      // For other requests within the same origin (HTML pages, API calls)
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          // Try network first for fresh content, fallback to cache
          return fetch(request).then((networkResponse) => {
            // Update cache with latest version
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          }).catch(() => {
            // Fallback to cached version
            return cachedResponse || caches.match('/');
          });
        })
      );
    }
  } else {
    // For cross-origin requests, use network first with cache fallback
    event.respondWith(
      fetch(request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        return caches.match('/favicon.ico');
      })
    );
  }
});

// Handle push notifications (if needed in future)
self.addEventListener('push', (event) => {
  console.log('Received a push event', event);
});

// Handle background sync (if needed in future)
self.addEventListener('sync', (event) => {
  console.log('Sync event received', event);
});