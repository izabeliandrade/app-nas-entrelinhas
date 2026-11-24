// Núcleo: roteamento, navegação, tema e inicialização
import * as db from './db.js';
import { $, $$, icons, sha256, esc } from './utils.js';
import { toast, closeTopSheet } from './ui.js';

const routes = [
  [/^$/, 'home', 'home'],
  [/^estante$/, 'shelf', 'estante'],
  [/^proximas-paginas$/, 'wishlist', 'estante'],
  [/^livro\/novo$/, 'bookForm', 'estante'],
  [/^livro\/([^/]+)\/editar$/, 'bookForm', 'estante', ['id']],
  [/^livro\/([^/]+)$/, 'book', 'estante', ['id']],
  [/^diario$/, 'diary', 'diario'],
  [/^pensamento\/novo$/, 'entryEditor', 'diario'],
  [/^pensamento\/([^/]+)$/, 'entryEditor', 'diario', ['id']],
  [/^resenha\/nova$/, 'reviewEditor', 'diario'],
  [/^resenha\/([^/]+)\/editar$/, 'reviewEditor', 'diario', ['id']],
  [/^resenha\/([^/]+)$/, 'review', 'diario', ['id']],
  [/^fragmentos$/, 'quotes', 'fragmentos'],
  [/^fragmento\/novo$/, 'quoteForm', 'fragmentos'],
  [/^fragmento\/([^/]+)$/, 'quoteForm', 'fragmentos', ['id']],
  [/^trajetoria$/, 'stats', 'trajetoria'],
  [/^retrospectiva(?:\/(\d{4}))?$/, 'retro', 'trajetoria', ['year']],
  [/^mapa-emocional$/, 'feelings', 'trajetoria'],
  [/^livros-que-ficaram$/, 'memorable', 'trajetoria'],
  [/^calendario$/, 'calendar', 'trajetoria'],
  [/^perfil$/, 'profile', 'home'],
  [/^imprimir\/(\w+)$/, 'print', 'trajetoria', ['kind']],
];

const loaders = {
  home: () => import('./views/home.js'),
  shelf: () => import('./views/shelf.js'),
  wishlist: () => import('./views/wishlist.js'),
  bookForm: () => import('./views/bookForm.js'),
  book: () => import('./views/book.js'),
  diary: () => import('./views/diary.js'),
  entryEditor: () => import('./views/entryEditor.js'),
  reviewEditor: () => import('./views/reviewEditor.js'),
  review: () => import('./views/review.js'),
  quotes: () => import('./views/quotes.js'),
  quoteForm: () => import('./views/quoteForm.js'),
  stats: () => import('./views/stats.js'),
  retro: () => import('./views/retro.js'),
  feelings: () => import('./views/feelings.js'),
  memorable: () => import('./views/memorable.js'),
  calendar: () => import('./views/calendar.js'),
  profile: () => import('./views/profile.js'),
  print: () => import('./views/print.js'),
};

const sectionRoots = { home: '#/', estante: '#/estante', diario: '#/diario', fragmentos: '#/fragmentos', trajetoria: '#/trajetoria' };
let cleanup = null;
let currentSection = 'home';
let renderToken = 0;
const stack = []; // histórico interno, para o botão voltar
let replacing = false;

export function go(path, { replace = false } = {}) {
  const h = path.startsWith('#') ? path : '#/' + path.replace(/^\//, '');
  if (replace) { replacing = true; history.replaceState(null, '', h); route(); }
  else location.hash = h;
}
export function back() {
  if (stack.length > 1) history.back();
  else go(sectionRoots[currentSection] || '#/', { replace: true });
}

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs] = h.split('?');
  return { path: path.replace(/\/$/, ''), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

export async function route({ keepScroll = false } = {}) {
  const token = ++renderToken;
  const { path, query } = parseHash();
  const h = location.hash || '#/';
  if (replacing) { stack[stack.length - 1] = h; replacing = false; }
  else if (stack[stack.length - 2] === h) stack.pop();
  else if (stack[stack.length - 1] !== h) stack.push(h);
  let match = null;
  for (const [re, name, section, keys = []] of routes) {
    const m = path.match(re);
    if (m) { match = { name, section, params: Object.fromEntries(keys.map((k, i) => [k, m[i + 1]])) }; break; }
  }
  if (!match) { go('#/', { replace: true }); return; }
  while (closeTopSheet()) { /* fecha folhas abertas */ }
  if (cleanup) { try { await cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  document.body.classList.remove('writing');
  currentSection = match.section;
  $$('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.nav === match.section));
  const view = $('#view');
  const y = window.scrollY;
  try {
    const mod = await loaders[match.name]();
    if (token !== renderToken) return;
    const ctx = { params: match.params, query, root: view, go, back, refresh: () => route({ keepScroll: true }) };
    view.classList.remove('enter');
    view.onclick = view.oninput = view.onchange = null;
    const result = await mod.render(ctx);
    if (token !== renderToken) return;
    cleanup = typeof result === 'function' ? result : null;
    if (keepScroll) window.scrollTo(0, y);
    else { window.scrollTo(0, 0); void view.offsetWidth; view.classList.add('enter'); }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty"><p class="empty-title serif">Algo saiu do lugar.</p><p class="empty-text">${esc(e.message || e)}</p><a class="btn btn-soft" href="#/">Voltar ao início</a></div>`;
  }
}

// Botão "voltar" e links internos
document.addEventListener('click', e => {
  const b = e.target.closest('[data-back]');
  if (b) { e.preventDefault(); back(); }
});
window.addEventListener('hashchange', () => route());

// ---------- Tema ----------
const mq = matchMedia('(prefers-color-scheme: dark)');
export function applyTheme(theme) {
  try { localStorage.setItem('ne-theme', theme); } catch (e) { /* armazenamento indisponível */ }
  const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
  document.documentElement.setAttribute('data-theme-resolved', dark ? 'dark' : 'light');
  $('#theme-color')?.setAttribute('content', dark ? '#2A1F25' : '#FBF5F3');
}
mq.addEventListener?.('change', async () => applyTheme(await db.getSetting('theme', 'auto')));

// ---------- Bloqueio por PIN (opcional) ----------
async function lockIfNeeded() {
  const hash = await db.getSetting('pinHash', null);
  if (!hash || sessionStorage.getItem('ne-unlocked') === hash) return;
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'lock-screen';
    el.innerHTML = `<svg class="flora" style="position:static;width:80px;height:107px" viewBox="0 0 240 320" aria-hidden="true"><use href="#floral-sprig"/></svg>
      <h1>Nas Entrelinhas</h1><p>Este diário é só seu.</p>
      <form><input type="password" inputmode="numeric" autocomplete="current-password" maxlength="12" aria-label="PIN" placeholder="••••"></form>
      <p class="small muted lock-err" style="font-family:var(--f-ui);font-style:normal;min-height:20px"></p>`;
    document.body.appendChild(el);
    const input = el.querySelector('input');
    setTimeout(() => input.focus(), 100);
    el.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      if (await sha256('ne:' + input.value) === hash) {
        try { sessionStorage.setItem('ne-unlocked', hash); } catch (err) { /* ok */ }
        el.remove(); resolve();
      } else { el.querySelector('.lock-err').textContent = 'PIN incorreto.'; input.value = ''; }
    };
  });
}

// ---------- Inicialização ----------
async function init() {
  $$('[data-icon]').forEach(s => { s.innerHTML = icons[s.dataset.icon]; });
  try {
    applyTheme(await db.getSetting('theme', 'auto'));
  } catch (e) {
    $('#view').innerHTML = `<div class="empty"><p class="empty-title serif">Não foi possível abrir o armazenamento local.</p><p class="empty-text">Verifique se o navegador não está em modo privativo e permite armazenamento de sites.</p></div>`;
    return;
  }
  await lockIfNeeded();
  db.requestPersistence();
  try {
    const { applySeed } = await import('./seed.js');
    const n = await applySeed();
    if (n) setTimeout(() => toast(`${n} livros e resenhas do seu diário foram adicionados à estante`), 600);
  } catch (e) { console.error('seed', e); }
  await route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w && w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nova versão disponível — reabra o app para atualizar.');
        });
      });
    }).catch(() => { /* offline indisponível */ });
  }
}
init();

// Instalação (Android/desktop)
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; document.documentElement.classList.add('can-install'); });
export function canInstall() { return !!installEvent; }
export async function promptInstall() {
  if (!installEvent) return false;
  installEvent.prompt();
  const r = await installEvent.userChoice; installEvent = null;
  return r.outcome === 'accepted';
}
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
