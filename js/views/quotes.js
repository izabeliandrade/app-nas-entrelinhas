import * as db from '../db.js';
import { html, raw, icon, icons, matches, esc, $ } from '../utils.js';
import { emptyState, pageHeader, openSheet, toast } from '../ui.js';

const st = { q: '', author: '', book: '', tag: '', fav: false };

export function quoteCard(q, book) {
  const title = book?.title || q.bookTitle || '';
  const author = q.author || book?.author || q.bookAuthor || '';
  return html`<a class="qcard qs-${q.style || 'creme'}" href="#/fragmento/${q.id}">
    ${q.favorite ? html`<span class="fav">${raw(icons.heartFill)}</span>` : ''}
    <blockquote>${q.text}</blockquote>
    <div class="src"><span class="line"></span><p>${author}${title ? html`${author ? ' · ' : ''}<i>${title}</i>` : ''}${q.page ? `, p. ${q.page}` : ''}</p></div>
    ${q.comment ? html`<p class="comment">${q.comment}</p>` : ''}
  </a>`;
}

export async function render({ root }) {
  const [quotes, books] = await Promise.all([db.all('quotes'), db.all('books')]);
  const bmap = new Map(books.map(b => [b.id, b]));
  const authorOf = q => q.author || bmap.get(q.bookId)?.author || q.bookAuthor || '';
  const titleOf = q => bmap.get(q.bookId)?.title || q.bookTitle || '';

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Fragmentos', kicker: 'Trechos que ficaram', actions: html`<button class="icon-btn" data-filter aria-label="Filtrar">${icon('filter')}</button><a class="icon-btn" href="#/fragmento/novo" aria-label="Novo fragmento">${icon('plus')}</a>` })}
    ${quotes.length ? html`
      <div class="searchbar" style="margin-bottom:12px"><span class="ic">${raw(icons.search)}</span><input type="search" data-q placeholder="Buscar por palavra, livro ou autor" value="${st.q}" aria-label="Buscar fragmentos"></div>
      <div class="chips" style="margin-bottom:14px"><button class="chip ${!st.fav ? 'active' : ''}" data-fav="0">Todos <span class="count">${quotes.length}</span></button><button class="chip ${st.fav ? 'active' : ''}" data-fav="1">Favoritos <span class="count">${quotes.filter(q => q.favorite).length}</span></button></div>
      <div class="active-filters" data-active></div>` : ''}
    <div data-out></div>
    <a class="fab" href="#/fragmento/novo" aria-label="Guardar fragmento">${icon('plus')}</a>
  `);

  const draw = () => {
    const out = $('[data-out]', root);
    if (!quotes.length) {
      out.innerHTML = String(emptyState('Algumas frases a gente lê uma vez e carrega para sempre.', 'Guarde aqui os trechos que sublinhou — com página, livro e o que eles te disseram.', html`<a class="btn btn-primary" href="#/fragmento/novo">${icon('quote')} Guardar o primeiro trecho</a>`));
      return;
    }
    const act = [];
    if (st.author) act.push(['author', st.author]);
    if (st.book) act.push(['book', bmap.get(st.book)?.title || st.book]);
    if (st.tag) act.push(['tag', '#' + st.tag]);
    $('[data-active]', root).innerHTML = act.map(([k, l]) => `<button data-clear="${k}">${esc(l)} <span class="ic">${icons.close}</span></button>`).join('');
    const list = quotes.filter(q => {
      if (st.fav && !q.favorite) return false;
      if (st.author && authorOf(q) !== st.author) return false;
      if (st.book && q.bookId !== st.book && titleOf(q) !== st.book) return false;
      if (st.tag && !(q.tags || []).includes(st.tag)) return false;
      return matches(st.q, q.text, q.comment, q.tags, authorOf(q), titleOf(q));
    }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
    out.innerHTML = list.length ? String(html`<div class="quote-list">${list.map(q => quoteCard(q, bmap.get(q.bookId)))}</div>`)
      : String(emptyState('Nenhum fragmento encontrado.', 'Tente outra palavra ou limpe os filtros.'));
  };
  draw();

  root.oninput = e => { if (e.target.matches('[data-q]')) { st.q = e.target.value; draw(); } };
  root.onclick = e => {
    const fv = e.target.closest('[data-fav]');
    if (fv) { st.fav = fv.dataset.fav === '1'; root.querySelectorAll('[data-fav]').forEach(b => b.classList.toggle('active', b === fv)); draw(); return; }
    const c = e.target.closest('[data-clear]');
    if (c) { st[c.dataset.clear] = ''; draw(); return; }
    if (e.target.closest('[data-filter]')) {
      if (!quotes.length) { toast('Ainda não há fragmentos para filtrar.'); return; }
      const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');
      const authors = [...new Set(quotes.map(authorOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
      const bks = [...new Map(quotes.map(q => [q.bookId || titleOf(q), titleOf(q)]).filter(([k, t]) => k && t)).entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt'));
      const tags = [...new Set(quotes.flatMap(q => q.tags || []))].sort();
      const { el, close } = openSheet(String(html`<form class="form">
        <label class="field"><span>Autor(a)</span><select name="author"><option value="">Todos</option>${authors.map(a => html`<option ${sel(st.author, a)}>${a}</option>`)}</select></label>
        <label class="field"><span>Livro</span><select name="book"><option value="">Todos</option>${bks.map(([k, t]) => html`<option value="${k}" ${sel(st.book, k)}>${t}</option>`)}</select></label>
        <label class="field"><span>Tag</span><select name="tag"><option value="">Todas</option>${tags.map(t => html`<option ${sel(st.tag, t)}>${t}</option>`)}</select></label>
        <div class="row-btns"><button type="button" class="btn btn-ghost" data-reset>Limpar</button><button class="btn btn-primary">Aplicar</button></div></form>`), { title: 'Filtrar fragmentos' });
      const f = el.querySelector('form');
      el.querySelector('[data-reset]').onclick = () => { st.author = st.book = st.tag = ''; close(); draw(); };
      f.onsubmit = ev => { ev.preventDefault(); st.author = f.author.value; st.book = f.book.value; st.tag = f.tag.value; close(); draw(); };
    }
  };
}
