const CACHE_NAME = 'maarif3-v65';
const CACHE_FILES = [
  './',
  './index.html',
  './css/style.css',
  './css/maarif-kit.css',
  './css/stitch-kit.css',
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
  './js/app.js',
  './manifest.json',
  './assets/welcome_screen_hq.jpg',
  './assets/victory_screen_hq.jpg',
  './assets/space_bg_hq.jpg',
  './assets/game_logo_splash.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/mascot_star.png',
  './assets/mascot_star_circular.png',
  './assets/icons/subj_turkce.svg',
  './assets/icons/subj_matematik.svg',
  './assets/icons/subj_hayat.svg',
  './assets/icons/subj_fen.svg',
  './assets/icons/subj_ingilizce.svg',
  './assets/icons/subj_muzik.svg',
  './assets/icons/nav_home.svg',
  './assets/icons/nav_books.svg',
  './assets/icons/nav_games.svg',
  './assets/icons/nav_badges.svg',
  './assets/icons/nav_profile.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
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
  if (event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
