// sw.js — le "service worker" : un script qui tourne en arrière-plan dans le navigateur.
// Il garde une copie des fichiers de l'app pour qu'elle s'ouvre même sans internet.
//
// Stratégie "réseau d'abord" :
// - avec du réseau : on charge la dernière version (et on met la copie à jour) ;
// - sans réseau (ou s'il met plus de 3 s à répondre) : on utilise la copie.
//
// ⚠️ Si tu ajoutes un fichier à l'app, ajoute-le aussi dans la liste FILES ci-dessous.

const CACHE = 'calisthenie-v2';
const NETWORK_TIMEOUT_MS = 3000;

const FILES = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/dates.js',
  'js/storage.js',
  'js/ui.js',
  'js/library-data.js',
  'js/library.js',
  'js/default-program.js',
  'js/progress.js',
  'js/session.js',
  'js/sortable.js',
  'js/exercise-form.js',
  'js/exercise-list.js',
  'js/backup.js',
  'js/week-view.js',
  'js/daily.js',
  'js/settings.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

// Installation : on met tous les fichiers de côté
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting(); // la nouvelle version prend la main tout de suite
});

// Activation : on supprime les copies des anciennes versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Chaque fois que l'app demande un fichier
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // On ne s'occupe que des fichiers de l'app elle-même
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('réseau trop lent')), NETWORK_TIMEOUT_MS));
    const response = await Promise.race([fetch(request), timeout]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // Page demandée hors connexion : on renvoie l'app
    if (request.mode === 'navigate') return cache.match('index.html');
    throw error;
  }
}
