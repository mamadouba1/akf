// ── AKF Service Worker ── Version à incrémenter à chaque déploiement
const CACHE_VERSION = 'akf-v3';
const CACHE_NAME = CACHE_VERSION;

// Fichiers à mettre en cache
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALLATION : mise en cache des assets
self.addEventListener('install', event => {
  // Force l'activation immédiate sans attendre la fermeture des onglets
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ── ACTIVATION : supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('🗑️ Suppression ancien cache :', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      // Prend le contrôle de tous les onglets ouverts immédiatement
      return self.clients.claim();
    })
  );
});

// ── FETCH : Network First (toujours essayer le réseau d'abord)
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes externes (Supabase, etc.)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la réponse réseau est ok, on met à jour le cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Pas de réseau → on sert depuis le cache
        return caches.match(event.request);
      })
  );
});

// ── MESSAGE : permet de forcer la mise à jour depuis l'app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
