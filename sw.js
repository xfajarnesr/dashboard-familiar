// Service worker: l'app funciona sense xarxa. Xarxa primer per al codi (així les actualitzacions arriben de seguida).
const CACHE = 'casa-v5';
const SHELL = ['./', 'index.html', 'css/app.css?v=5', 'js/main.js?v=5', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'api.github.com' || url.hostname === 'api.open-meteo.com') return; // dades: sempre en directe
  const sameOrigin = url.origin === location.origin;
  const fonts = url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');
  if (!sameOrigin && !fonts) return;
  e.respondWith(
    // no-cache: sempre pregunta al servidor si hi ha versió nova (si no n'hi ha, respon 304 i és ràpid)
    fetch(e.request, sameOrigin ? { cache: 'no-cache' } : {}).then((res) => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: sameOrigin }).then((r) => r || caches.match('index.html')))
  );
});
