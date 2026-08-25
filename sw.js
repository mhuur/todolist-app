/* Service worker de MyTodo — sa SEULE raison d'être est de rendre l'app installable
   (Chrome exige un service worker avec un gestionnaire fetch) et de garder l'écran
   utilisable hors ligne. Volontairement minimal.

   ⚠️ Stratégie « réseau d'abord » pour la navigation : index.html n'est JAMAIS servi
   depuis le cache tant que le réseau répond, sinon un déploiement (push sur main)
   ne serait plus visible. Le cache ne sert que de secours hors ligne.
   Les requêtes tierces (Firebase, Google Fonts, CDN React/Babel) ne sont pas
   interceptées du tout. */
const CACHE = 'mytodo-shell-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;   // Firebase, fonts, CDN : on ne touche pas

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html').then(r => r || Response.error()))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req))
  );
});
