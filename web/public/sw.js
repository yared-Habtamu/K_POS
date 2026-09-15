self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // API and Socket.IO calls must always reach the network.  Returning a
  // synthetic offline response for Socket.IO makes the client repeatedly fail
  // its polling handshake even while the backend is available.
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("/socket.io/")
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response("Offline", { status: 503, statusText: "Offline" });
    })
  );
});
