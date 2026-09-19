const CACHE = "vaultbudget-v2-3";
const APP_SHELL = [
  "./", "./index.html", "./styles-core.css", "./styles-components.css", "./styles-responsive.css",
  "./app-core.js", "./app-dashboard.js", "./app-reports.js", "./app-settings.js", "./app-actions.js", "./app-cloud.js", "./app-init.js",
  "./supabase-config.js", "./manifest.webmanifest", "./assets/vaultbudget-icon.svg", "./privacy.html", "./terms.html"
];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
});
