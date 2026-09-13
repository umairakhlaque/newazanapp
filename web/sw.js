const CACHE_NAME = "siea-prayer-display-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./prayer-engine.js",
  "./app.js",
  "./admin.html",
  "./admin.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./data/payload.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/data/payload.json")) {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("./data/payload.json", copy));
      return response;
    }).catch(() => caches.match("./data/payload.json")));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
