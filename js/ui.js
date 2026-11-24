// Componentes de interface reutilizáveis
import { html, raw, esc, icon, icons, $, $$ } from './utils.js';

// ---------- Toast ----------
export function toast(msg, type = 'ok') {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${type === 'error' ? '' : `<span class="ic">${icons.check}</span>`}<span>${esc(msg)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, type === 'error' ? 4200 : 2600);
}

// ---------- Modal / bottom sheet ----------
let sheetStack = [];
export function openSheet(content, { title = '', onClose, className = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-handle"></div>
      ${title ? `<div class="sheet-head"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Fechar">${icons.close}</button></div>` : ''}
      <div class="sheet-body">${content}</div>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = (val) => {
    if (!wrap.isConnected) return;
    wrap.classList.remove('open');
    sheetStack = sheetStack.filter(s => s !== close);
    if (!sheetStack.length) document.body.classList.remove('no-scroll');
    setTimeout(() => wrap.remove(), 300);
    onClose && onClose(val);
  };
  sheetStack.push(close);
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => close());
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  return { el: wrap.querySelector('.sheet'), close };
}
export function closeTopSheet() { const c = sheetStack[sheetStack.length - 1]; if (c) { c(); return true; } return false; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTopSheet(); });

export function confirmDialog({ title = 'Tem certeza?', message = '', confirm = 'Excluir', cancel = 'Cancelar', danger = true } = {}) {
  return new Promise(resolve => {
    let answered = false;
    const { el, close } = openSheet(`
      <div class="confirm">
        <h3 class="serif">${esc(title)}</h3>
        ${message ? `<p class="muted">${esc(message)}</p>` : ''}
        <div class="row-btns">
          <button class="btn btn-ghost" data-no>${esc(cancel)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirm)}</button>
        </div>
      </div>`, { className: 'sheet-sm', onClose: () => { if (!answered) resolve(false); } });
    el.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); close(); };
    el.querySelector('[data-no]').onclick = () => { answered = true; resolve(false); close(); };
  });
}

export function promptDialog({ title, label = '', value = '', type = 'text', placeholder = '', confirm = 'Salvar', min, max, hint = '' }) {
  return new Promise(resolve => {
    let answered = false;
    const { el, close } = openSheet(`
      <form class="confirm" novalidate>
        <h3 class="serif">${esc(title)}</h3>
        <label class="field"><span>${esc(label)}</span>
          <input name="v" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} inputmode="${type === 'number' ? 'numeric' : 'text'}">
        </label>
        ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
        <div class="row-btns">
          <button type="button" class="btn btn-ghost" data-no>Cancelar</button>
          <button class="btn btn-primary">${esc(confirm)}</button>
        </div>
      </form>`, { className: 'sheet-sm', onClose: () => { if (!answered) resolve(null); } });
    const input = el.querySelector('input');
    setTimeout(() => { input.focus(); input.select && input.select(); }, 250);
    el.querySelector('form').onsubmit = e => { e.preventDefault(); answered = true; resolve(input.value); close(); };
    el.querySelector('[data-no]').onclick = () => { answered = true; resolve(null); close(); };
  });
}

// ---------- Capas ----------
const COVER_TONES = [['#7A2748', '#FBEFF3'], ['#7E9A74', '#FFFCFB'], ['#B5527F', '#FFFCFB'], ['#F5DCE9', '#7A2748'], ['#E2ECDF', '#33593C'], ['#9484AE', '#FFFCFB'], ['#C9A0B4', '#4A2E3B'], ['#4A2E3B', '#F5DCE9']];
function tone(str) { let h = 0; for (const c of (str || '')) h = (h * 33 + c.charCodeAt(0)) >>> 0; return COVER_TONES[h % COVER_TONES.length]; }

export function cover(book, size = 'md') {
  if (!book) return raw('');
  if (book.cover) {
    return html`<div class="cover cover-${size}"><img src="${book.cover}" alt="Capa de ${book.title}" loading="lazy" onerror="this.parentNode.classList.add('cover-broken');this.remove()"><span class="cover-fallback-title">${book.title}</span></div>`;
  }
  const [bg, fg] = tone(book.title);
  return html`<div class="cover cover-${size} cover-gen" style="--cbg:${bg};--cfg:${fg}">
    <span class="cg-line"></span><span class="cg-title">${book.title || 'Sem título'}</span><span class="cg-author">${book.author || ''}</span></div>`;
}

// ---------- Nota (estrelas) ----------
const STAR = '<svg viewBox="0 0 24 24"><path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.5l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>';
export function stars(rating = 0, cls = '') {
  if (!rating) return raw('');
  let out = '';
  for (let i = 1; i <= 5; i++) {
    const fill = Math.round(Math.max(0, Math.min(1, rating - (i - 1))) * 100);
    out += `<span class="star" style="--f:${fill}%">${STAR}</span>`;
  }
  return raw(`<span class="stars ${cls}" aria-label="Nota ${String(rating).replace('.', ',')} de 5">${out}</span>`);
}
export function ratingInput(name, value = 0) {
  let out = '';
  for (let i = 1; i <= 5; i++) out += `<button type="button" class="star" data-star="${i}" aria-label="${i} estrela${i > 1 ? 's' : ''}">${STAR}</button>`;
  return raw(`<div class="rating-input" data-rating="${name}"><input type="hidden" name="${name}" value="${value || 0}"><div class="stars stars-lg">${out}</div><span class="rating-val"></span><button type="button" class="link-btn rating-clear">limpar</button></div>`);
}
export function bindRatings(root) {
  $$('.rating-input', root).forEach(box => {
    const input = box.querySelector('input');
    const paint = () => {
      const v = Number(input.value) || 0;
      $$('.star', box).forEach((s, i) => s.style.setProperty('--f', Math.round(Math.max(0, Math.min(1, v - i)) * 100) + '%'));
      box.querySelector('.rating-val').textContent = v ? String(v).replace('.', ',') : 'sem nota';
      box.querySelector('.rating-clear').hidden = !v;
    };
    box.addEventListener('click', e => {
      if (e.target.closest('.rating-clear')) { input.value = 0; paint(); input.dispatchEvent(new Event('change', { bubbles: true })); return; }
      const s = e.target.closest('.star'); if (!s) return;
      const i = Number(s.dataset.star);
      const r = s.getBoundingClientRect();
      const half = (e.clientX - r.left) < r.width / 2 && e.clientX !== 0;
      input.value = half ? i - 0.5 : i;
      paint();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    paint();
  });
}

// ---------- Diversos ----------
export function emptyState(title, text, action = '') {
  return html`<div class="empty">
    <svg class="empty-art" viewBox="0 0 200 140" aria-hidden="true"><use href="#books-flowers"/></svg>
    <p class="empty-title serif">${title}</p>
    ${text ? html`<p class="empty-text">${text}</p>` : ''}
    ${action}
  </div>`;
}

export function pageHeader({ title, kicker = '', back = false, actions = '' }) {
  return html`<header class="page-head ${back ? 'with-back' : ''}">
    ${back ? html`<button class="icon-btn back-btn" data-back aria-label="Voltar">${icon('back')}</button>` : ''}
    ${!back ? raw('<svg class="head-flower" viewBox="0 0 120 60" aria-hidden="true"><use href="#sprig-small"/></svg>') : ''}
    <div class="page-head-text">${kicker ? html`<p class="kicker">${kicker}</p>` : ''}<h1 class="serif">${title}</h1></div>
    <div class="page-head-actions">${actions}</div>
  </header>`;
}

export function progressBar(pct, cls = '') {
  return raw(`<div class="progress ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`);
}

export function tagList(tags = [], cls = '') {
  if (!tags || !tags.length) return raw('');
  return html`<div class="tags ${cls}">${tags.map(t => html`<span class="tag">#${t}</span>`)}</div>`;
}

export function chips(options, active, attr = 'data-chip') {
  return html`<div class="chips" role="tablist">${options.map(([v, l]) => html`<button type="button" class="chip ${v === active ? 'active' : ''}" ${raw(attr)}="${v}" role="tab" aria-selected="${v === active}">${l}</button>`)}</div>`;
}

export function savedIndicator(el, state) {
  if (!el) return;
  el.dataset.state = state;
  el.textContent = state === 'saving' ? 'salvando…' : state === 'saved' ? 'salvo' : state === 'error' ? 'não foi possível salvar' : '';
}

export function autoGrow(textarea) {
  const fit = () => { textarea.style.height = 'auto'; textarea.style.height = Math.max(textarea.scrollHeight, 220) + 'px'; };
  textarea.addEventListener('input', fit); setTimeout(fit, 0);
}
