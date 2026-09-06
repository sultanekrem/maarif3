const CACHE_NAME = 'maarif3-v39';
const CACHE_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/curriculum-term1.js',
  './data/curriculum-term1.json',
  './js/engine/utils.js',
  './js/engine/audio.js',
  './js/engine/particles.js',
  './js/engine/renderer.js',
  './js/engine/input.js',
  './js/engine/game-loop.js',
  './js/math/questions.js',
  './js/progress.js',
  './js/modes/meteor.js',
  './js/modes/balloon.js',
  './js/modes/runner.js',
  './js/modes/match.js',
  './js/modes/chain.js',
  './js/app.js',
  './manifest.json',
  './assets/maarif_logo.svg',
  './assets/game_logo_splash.png',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // API isteklerini Service Worker önbelleğine alma, doğrudan ağa ilet
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
