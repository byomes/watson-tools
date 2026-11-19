const SHELL = 'hikenh-shell-v1', TILES = 'hikenh-tiles-v1';
const SHELL_URLS = ['/hikenh.html','https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => Promise.all(SHELL_URLS.map(u => c.add(new Request(u, {mode: u.startsWith('/') ? 'same-origin' : 'no-cors'}))))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const ok = u.pathname === '/hikenh.html' || u.hostname === 'unpkg.com' || u.hostname === 'server.arcgisonline.com';
  if (!ok || e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, {ignoreSearch: false}).then(hit => hit || fetch(e.request).catch(() => hit || new Response('', {status: 504}))));
});
