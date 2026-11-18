// Balázs weboldala – service worker (telepíthető alkalmazás + offline indulás)
// Új weboldal-verziónál nem kell itt semmit átírni: az oldal mindig a hálózatról frissül,
// a tárolt példányt csak akkor használja, ha nincs internet.
const CACHE = 'balazs-oldal-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Csak a saját oldal fájljait és a betűtípusokat/könyvtárakat tároljuk; a GitHub API-t és a Google szkriptet soha.
  const own = url.origin === location.origin;
  const lib = /(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!own && !lib) return;
  if (own && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    // Az oldal: először a hálózat (mindig a friss verzió), ha nincs net, a tárolt példány.
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Egyéb fájlok: tárolt példány, közben a háttérben frissítés.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
