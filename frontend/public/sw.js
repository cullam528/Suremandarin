const CACHE = "suremandarin-daily-v4";
const APP_SHELL = ["/images/suremandarin-icon.webp", "/images/suremandarin-logo.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("suremandarin-daily-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Never cache sign-in, account HTML, APIs or Next's RSC responses. A stale
  // login page can otherwise reappear when the network is unavailable.
  const publicAsset = url.pathname.startsWith("/images/") || url.pathname.startsWith("/course-detail/images/");
  const dailyDocument = event.request.mode === "navigate" && /^\/(en|zh)\/daily\/?$/.test(url.pathname);
  if (url.origin !== self.location.origin || (!publicAsset && !dailyDocument)
    || event.request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && !response.redirected
      && !/private|no-store/i.test(response.headers.get("Cache-Control") || "")
      && !/text\/x-component/i.test(response.headers.get("Content-Type") || "")) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
