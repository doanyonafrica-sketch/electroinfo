// ============================================================
// sw.js — Service Worker ElectroInfo Encyclopédie
// Cache-first pour les assets statiques,
// Network-first pour les données Firestore
// ============================================================

const CACHE_NAME    = 'electroinfo-enc-v1';
const CACHE_STATIC  = 'electroinfo-static-v1';
const CACHE_FICHES  = 'electroinfo-fiches-v1';

// Assets à mettre en cache immédiatement à l'installation
const STATIC_ASSETS = [
  '/encyclopedie.html',
  '/home.css',
  '/images/logo-small.png',
  '/images/logo.png',
  '/images/favicon.ico',
  // Fonts Google — on ne peut pas les pré-cacher (CORS), elles seront
  // mises en cache automatiquement lors du premier chargement
];

// ──────────────────────────────────────────
// INSTALL — pré-cache les assets statiques
// ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      // addAll échoue si un asset est indisponible — on utilise add individuel
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn('SW cache skip:', url, e.message)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ──────────────────────────────────────────
// ACTIVATE — supprimer les vieux caches
// ──────────────────────────────────────────
self.addEventListener('activate', event => {
  const VALID_CACHES = [CACHE_NAME, CACHE_STATIC, CACHE_FICHES];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !VALID_CACHES.includes(k)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ──────────────────────────────────────────
// FETCH — stratégie par type de requête
// ──────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Requêtes Firestore / API Google → Network only (pas de cache)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Fonts Google / cdnjs → Cache first (longue durée)
  if (
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // 3. Images → Cache first
  if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request, CACHE_STATIC));
    return;
  }

  // 4. Pages HTML → Network first, fallback cache
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request, CACHE_STATIC));
    return;
  }

  // 5. CSS / JS → Cache first avec revalidation en arrière-plan
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script'
  ) {
    event.respondWith(staleWhileRevalidate(event.request, CACHE_STATIC));
    return;
  }

  // 6. Tout le reste → Network first
  event.respondWith(networkFirst(event.request, CACHE_NAME));
});

// ──────────────────────────────────────────
// STRATÉGIES
// ──────────────────────────────────────────

// Cache d'abord, réseau si absent
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch(e) {
    return offlineFallback(request);
  }
}

// Réseau d'abord, cache si hors ligne
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch(e) {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

// Sert le cache immédiatement, met à jour en arrière-plan
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => {});
  return cached || fetchPromise;
}

// Page hors-ligne minimale si rien en cache
function offlineFallback(request) {
  if (request.destination === 'document') {
    return new Response(`<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Hors ligne — ElectroInfo</title>
      <style>
        body{font-family:system-ui,sans-serif;background:#0d0f14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px;}
        .box{max-width:400px;}
        h1{font-size:1.5rem;margin-bottom:12px;color:#3b82f6;}
        p{color:#8892a4;line-height:1.6;margin-bottom:20px;}
        a{display:inline-block;padding:10px 22px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;}
      </style>
    </head><body>
      <div class="box">
        <div style="font-size:3rem;margin-bottom:16px;">📡</div>
        <h1>Vous êtes hors ligne</h1>
        <p>ElectroInfo nécessite une connexion internet pour charger les fiches.<br>
        Les fiches déjà consultées sont disponibles dans votre cache.</p>
        <a href="/encyclopedie.html">Retour à l'encyclopédie</a>
      </div>
    </body></html>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  return new Response('', { status: 503 });
}

// ──────────────────────────────────────────
// MESSAGE — forcer la mise à jour du cache
// ──────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
