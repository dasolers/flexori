const CACHE_NAME = 'flexori-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/jobs.html',
  '/dashboard.html',
  '/register.html',
  '/learn.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalar: cachear assets estáticos
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', function(e) {
  // Solo cachear GET requests del mismo origen
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  // No cachear Netlify functions ni APIs externas
  if (e.request.url.includes('/.netlify/') || 
      e.request.url.includes('/rest/v1/') ||
      e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(e.request);
      })
  );
});
