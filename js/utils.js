// Utilitários gerais
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(v) {
  if (v === null || v === undefined || v === false) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Raw(s ?? '');

function flat(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(flat).join('');
  return esc(v);
}
// Template seguro: interpolações são escapadas, exceto raw() e arrays de raw
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += flat(v) + strings[i + 1]; });
  return new Raw(out);
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Datas
export const pad = n => String(n).padStart(2, '0');
export function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function toISODate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseDate(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  const d = new Date(s); return isNaN(d) ? null : d;
}
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export function fmtDate(s, style = 'short') {
  const d = parseDate(s); if (!d) return '';
  if (style === 'long') return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  if (style === 'month') return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
export function yearOf(s) { const d = parseDate(s); return d ? d.getFullYear() : null; }
export function monthOf(s) { const d = parseDate(s); return d ? d.getMonth() : null; }
export const dateOnly = s => (s || '').slice(0, 10);

export function debounce(fn, ms = 600) {
  let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  d.cancel = () => clearTimeout(t);
  return d;
}

export const norm = s => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const matches = (q, ...fields) => { const n = norm(q); return !n || fields.some(f => norm(Array.isArray(f) ? f.join(' ') : f).includes(n)); };

export const parseTags = s => [...new Set((s || '').split(/[,#]/).map(t => t.trim()).filter(Boolean))];
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function countBy(arr, keyFn) {
  const m = new Map();
  arr.forEach(x => { const ks = [].concat(keyFn(x) || []); ks.forEach(k => { if (k) m.set(k, (m.get(k) || 0) + 1); }); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function download(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function readFileAsDataURL(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

// Redimensiona imagens para guardar offline sem pesar
export function resizeImage(src, maxW = 480, maxH = 720, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const r = Math.min(1, maxW / img.width, maxH / img.height);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'));
    img.src = src;
  });
}

export function sha256(text) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    .then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''));
}

export function excerpt(text, n = 160) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
}

// Ícones minimalistas (traço fino)
const I = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
export const icons = {
  home: I('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
  shelf: I('<path d="M5 4v16M9 4v16M13.5 5.2l3.9 14.6M3 20h18"/>'),
  diary: I('<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2M9.5 8h5M9.5 11.5h5"/>'),
  quote: I('<path d="M9.5 7C6.5 8 5 10.2 5 13v4h4.5v-4.5H7c0-2 .9-3.3 2.5-4zM18.5 7c-3 1-4.5 3.2-4.5 6v4h4.5v-4.5H16c0-2 .9-3.3 2.5-4z"/>'),
  path: I('<path d="M4 20c3-1 4-4 6-8s4-7 10-8"/><circle cx="20" cy="4" r="1.2"/><circle cx="4" cy="20" r="1.2"/>'),
  user: I('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  search: I('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  edit: I('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  heartFill: I('<path fill="currentColor" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  grid: I('<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>'),
  list: I('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'),
  filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  sort: I('<path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3"/>'),
  book: I('<path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2zM12 6.5v14"/>'),
  bookmark: I('<path d="M7 4h10v16l-5-3.5L7 20z"/>'),
  star: I('<path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2 7.2 18.8l1-5.4-4-3.7 5.4-.7z"/>'),
  calendar: I('<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>'),
  leaf: I('<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>'),
  sparkle: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
  share: I('<path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>'),
  download: I('<path d="M12 4v11M8 11l4 4 4-4M5 19h14"/>'),
  upload: I('<path d="M12 16V5M8 9l4-4 4 4M5 19h14"/>'),
  image: I('<rect x="4" y="4" width="16" height="16" rx="1.5"/><circle cx="9" cy="9.5" r="1.5"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>'),
  camera: I('<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  chevronR: I('<path d="m9 5 7 7-7 7"/>'),
  chevronL: I('<path d="m15 5-7 7 7 7"/>'),
  chevronD: I('<path d="m5 9 7 7 7-7"/>'),
  more: I('<circle cx="5.5" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="18.5" cy="12" r=".9" fill="currentColor"/>'),
  feather: I('<path d="M20 4C11 4 6 9 6 18M6 18l-2 2M6 18h7c4 0 7-4 7-14M9 15h6"/>'),
  moon: I('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
  sun: I('<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
  lock: I('<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  clock: I('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
  flame: I('<path d="M12 21c-3.5 0-6-2.4-6-5.8 0-3.6 3-5.2 3.6-9.2 2 1.3 3 3.2 3 5 1-.6 1.6-1.8 1.8-3 1.8 1.6 3.6 4.2 3.6 7.2 0 3.4-2.5 5.8-6 5.8z"/>'),
  arrowUp: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  arrowR: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  wand: I('<path d="M4 20 15 9M14 4v2M19 9h2M17.5 5.5 19 4M15 9l-2-2"/>'),
  file: I('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'),
  print: I('<path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z"/>'),
  map: I('<path d="M9 5 4 7v13l5-2 6 2 5-2V5l-5 2zM9 5v13M15 7v13"/>'),
};
export const icon = (name, cls = '') => raw(`<span class="ic ${cls}">${icons[name] || ''}</span>`);
