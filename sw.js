const CACHE_NAME = 'piezauto-v1';
const PAGINAS_CACHE = [
  '/',
  '/index.html',
  '/catalogo.html',
  '/busqueda.html',
  '/talleres.html',
  '/ofertas.html',
  '/seguimiento.html',
  '/css/estilos.css',
  '/js/supabase.js',
  '/js/autocomplete.js',
  '/js/notifications.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PAGINAS_CACHE).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Solo cachear requests GET del mismo origen
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Requests a Supabase siempre van a la red
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cachear solo respuestas exitosas de páginas HTML y assets estáticos
        if (response.ok && (e.request.url.endsWith('.html') || e.request.url.endsWith('.css') || e.request.url.endsWith('.js'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
