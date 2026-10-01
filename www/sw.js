const CACHE = "mindys-world-v10";
const FILES = ["./", "./index.html", "./styles.css", "./world.css", "./globe.css", "./mind.css", "./config.js", "./cloud.js", "./data.js", "./world3d.js", "./globe.js", "./app.js", "./openworld.js", "./ow-assets.js", "./ow-world.js", "./openworld.css", "./vendor/three.module.min.js", "./assets/earth-day.webp", "./assets/earth-day-mobile.webp", "./assets/earth-game-map.webp", "./assets/earth-clouds.webp", "./assets/earth-night.webp", "./assets/adventure-loop.mp3", "./privacy.html", "./delete-account.html", "./reset.html", "./account-pages.css", "./account-pages.js", "./manifest.webmanifest", "./icons/sunflower-emoji.svg", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))), self.clients.claim()]));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith(fetch(event.request, {cache:"no-cache"}).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
