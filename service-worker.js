const CACHE = "jp-flashcards-v5-cache-fix";
const FALLBACK = "./index.html";
const ASSETS = ["./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // Always try the newest HTML from the network first.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(FALLBACK, copy));
          return res;
        })
        .catch(() => caches.match(FALLBACK))
    );
    return;
  }

  // Static assets can be cached, but refresh them in the background.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req, { cache: "no-store" }).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
