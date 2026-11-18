// Client Hub service worker: network pass-through only. No caching, so check-ins and plans are never stale.
self.addEventListener("install", function (event) { self.skipWaiting(); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (event) { event.respondWith(fetch(event.request)); });
