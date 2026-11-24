// Service worker — funcionamento offline
const VERSION = 'ne-v1.2.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/app.js', 'js/db.js', 'js/utils.js', 'js/ui.js', 'js/model.js', 'js/actions.js', 'js/pickers.js', 'js/search.js',
  'js/writer.js', 'js/share.js', 'js/charts.js', 'js/backup.js', 'js/demo.js',
  'js/views/home.js', 'js/views/shelf.js', 'js/views/wishlist.js', 'js/views/bookForm.js', 'js/views/book.js',
  'js/views/diary.js', 'js/views/entryEditor.js', 'js/views/reviewEditor.js', 'js/views/review.js',
  'js/views/quotes.js', 'js/views/quoteForm.js', 'js/views/stats.js', 'js/views/retro.js', 'js/views/feelings.js',
  'js/views/memorable.js', 'js/views/calendar.js', 'js/views/profile.js', 'js/views/print.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'js/seed.js', 'img/cantinho.svg', 'img/livro-florido.svg',
  'covers/vou-te-receitar-um-gato.jpg', 'covers/jantar-secreto.jpg', 'covers/as-vacas-nao-me-olham-mais-na-cara.jpg', 'covers/o-peso-do-passaro-morto.jpg', 'covers/a-metamorfose.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'ne-runtime').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // APIs de busca de livros: sempre pela rede
  if (/googleapis\.com\/books|openlibrary\.org\/search/.test(req.url)) return;

  // app: cache primeiro, atualiza em segundo plano
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => {
      const net = fetch(req).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone())); return res; }).catch(() => cached || caches.match('index.html'));
      return cached || net;
    }));
    return;
  }
  // fontes e capas externas: cache em tempo de execução
  if (/fonts\.(googleapis|gstatic)\.com|covers\.openlibrary\.org|books\.google|googleusercontent/.test(url.host + url.pathname)) {
    e.respondWith(caches.open('ne-runtime').then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
      catch (err) { return hit || Response.error(); }
    }));
  }
});
