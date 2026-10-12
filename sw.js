// VaultBudget PWA: isolate app-shell caching from account/API responses.
const CACHE = "vaultbudget-v2-4";
const PREFIX = "vaultbudget-";
const APP_SHELL = [
  "./", "./index.html", "./styles-core.css", "./styles-components.css", "./styles-responsive.css",
  "./app-core.js", "./app-dashboard.js", "./app-reports.js", "./app-settings.js",
  "./app-actions.js", "./app-cloud.js", "./app-init.js", "./supabase-config.js",
  "./manifest.webmanifest", "./assets/vaultbudget-icon.svg", "./privacy.html", "./terms.html"
];
const SAFE_PATHS = new Set(APP_SHELL.map(path => new URL(path, self.location.href).pathname));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/") || url.pathname.startsWith("/.netlify/functions/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (!response.ok) throw new Error("Navigation unavailable");
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match("./index.html")) || Response.error();
    }));
    return;
  }
  if (!SAFE_PATHS.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  }));
});
