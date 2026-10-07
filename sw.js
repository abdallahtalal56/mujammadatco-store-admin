const SW_VERSION = 'mjk-pwa-v1';
const SHELL_CACHE = `${SW_VERSION}-shell`;
const IMAGE_CACHE = 'mjk-images-v1'; // ثابت ومنفصل عن نسخة الشِل — تحديثات التطبيق ما تمسح الصور المخزّنة
const ACTIVE_CACHES = new Set([SHELL_CACHE, IMAGE_CACHE]);
const SHELL_FILES = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mjk-') && !ACTIVE_CACHES.has(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName, fallback){
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallback) return cache.match(fallback);
    throw e;
  }
}
async function cacheFirst(request, cacheName){
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request, { mode: 'no-cors' });
  if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.destination === 'image') { event.respondWith(cacheFirst(request, IMAGE_CACHE)); return; }
  if (request.mode === 'navigate') { event.respondWith(networkFirst(request, SHELL_CACHE, './index.html')); return; }
  if (url.origin === self.location.origin) { event.respondWith(networkFirst(request, SHELL_CACHE)); return; }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
