const VERSION = "cinehub-v3";
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const IMAGES = `${VERSION}-images`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/api.js",
  "./assets/js/config.js",
  "./assets/js/router.js",
  "./assets/js/render.js",
  "./assets/js/player.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith("cinehub-") &&
          ![SHELL, DATA, IMAGES].includes(name))
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

function isTMDBData(url) {
  return url.origin === "https://api.themoviedb.org" &&
    url.pathname.startsWith("/3/");
}

function isTMDBImage(url) {
  return url.origin === "https://image.tmdb.org" &&
    url.pathname.startsWith("/t/p/");
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

const url = new URL(request.url);

// Nunca intercetar o fornecedor de reprodução nem outros serviços externos.
  if (isTMDBData(url)) {
    event.respondWith(networkFirst(request, DATA));
    return;
  }

if (isTMDBImage(url)) {
    event.respondWith(cacheFirst(request, IMAGES));
    return;
  }

if (url.origin !== self.location.origin) return;

if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL);
          await cache.put("./index.html", response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match("./index.html")) ||
          Response.error();
      }
    })());
    return;
  }

event.respondWith(cacheFirst(request, SHELL));
});
