// Service worker Kantinku Admin.
// Tujuan utama: aplikasi bisa di-install ke home screen HP (PWA) dan shell tetap
// terbuka saat koneksi buruk. Data (API) TIDAK pernah di-cache supaya tidak basi.

const CACHE = 'kantinku-admin-v1';

// Aktifkan versi baru secepatnya.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Hapus cache versi lama.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET same-origin. Sisanya (POST, API, cross-origin) biarkan lewat.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API selalu langsung ke jaringan — jangan pernah cache data.
  if (url.pathname.startsWith('/api/')) return;

  // Navigasi halaman (SPA): coba jaringan dulu, fallback ke shell index.html.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match('/index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Aset statis (JS/CSS/font/gambar ber-hash): cache-first, isi cache saat pertama.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
