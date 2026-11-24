import * as db from '../db.js';
import { html, raw, icon, icons, matches, esc, fmtDate, $ } from '../utils.js';
import { cover, stars, progressBar, emptyState, pageHeader, chips, openSheet } from '../ui.js';
import { STATUS, FORMATS, progressOf, readYear } from '../model.js';

const state = { quick: 'todos', q: '', genre: '', format: '', rating: '', year: '', sort: 'recent', dir: 'desc' };
const SORTS = { recent: 'Atualização recente', title: 'Título', author: 'Autor', date: 'Data de leitura', rating: 'Nota', pages: 'Número de páginas' };

function loadView() { try { return localStorage.getItem('ne-shelf-view') || 'grid'; } catch (e) { return 'grid'; } }
function saveView(v) { try { localStorage.setItem('ne-shelf-view', v); } catch (e) { /* ok */ } }

export async function render({ root, query, refresh }) {
  if (query.f) state.quick = query.f;
  const books = await db.all('books');
  let view = loadView();
  const hasDemo = books.some(b => b.isDemo);

  const counts = { todos: books.length, favoritos: books.filter(b => b.favorite).length };
  Object.keys(STATUS).forEach(s => counts[s] = books.filter(b => b.status === s).length);
  const quick = [['todos', 'Todos'], ['lendo', 'Lendo'], ['concluido', 'Concluídos'], ['quero-ler', 'Quero ler'], ['pausado', 'Pausados'], ['abandonado', 'Abandonados'], ['favoritos', 'Favoritos']];
  const genres = [...new Set(books.map(b => b.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const years = [...new Set(books.map(readYear).filter(Boolean))].sort((a, b) => b - a);

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Estante', kicker: 'Minha biblioteca', actions: html`
      <button class="icon-btn" data-view aria-label="Alternar visualização">${icon(view === 'grid' ? 'list' : 'grid')}</button>
      <a class="icon-btn" href="#/livro/novo" aria-label="Cadastrar livro">${icon('plus')}</a>` })}
    ${hasDemo ? html`<div class="demo-banner"><p>Você está vendo <b>dados de exemplo</b>. Eles podem ser removidos a qualquer momento.</p><button class="btn btn-sm btn-ghost" data-rmdemo>Remover</button></div>` : ''}
    <div class="toolbar">
      <div class="searchbar"><span class="ic">${raw(icons.search)}</span><input type="search" data-q placeholder="Título, autor ou ISBN" value="${state.q}" aria-label="Buscar na estante"></div>
      <button class="icon-btn bordered" data-filters aria-label="Filtros e ordenação">${icon('filter')}</button>
    </div>
    <div class="chips" style="margin-bottom:14px">${quick.map(([v, l]) => html`<button class="chip ${state.quick === v ? 'active' : ''}" data-chip="${v}">${l}<span class="count">${counts[v] || 0}</span></button>`)}</div>
    <div class="active-filters" data-active></div>
    <div data-results></div>
    <a class="btn btn-ghost btn-block" href="#/proximas-paginas" style="margin-top:28px">${icon('bookmark')} Próximas páginas — lista de desejos</a>
  `);

  const drawActive = () => {
    const a = [];
    if (state.genre) a.push(['genre', state.genre]);
    if (state.format) a.push(['format', FORMATS[state.format]]);
    if (state.rating) a.push(['rating', `nota ≥ ${state.rating}`]);
    if (state.year) a.push(['year', `lidos em ${state.year}`]);
    if (state.sort !== 'recent') a.push(['sort', `${SORTS[state.sort]} ${state.dir === 'asc' ? '↑' : '↓'}`]);
    $('[data-active]', root).innerHTML = a.map(([k, l]) => `<button data-clear="${k}">${esc(l)} ${icons.close.replace('<svg', '<svg class="ic"')}</button>`).join('');
  };

  const draw = () => {
    let list = books.filter(b => {
      if (state.quick === 'favoritos') { if (!b.favorite) return false; }
      else if (state.quick !== 'todos' && b.status !== state.quick) return false;
      if (state.genre && b.genre !== state.genre) return false;
      if (state.format && b.format !== state.format) return false;
      if (state.rating && !((b.rating || 0) >= Number(state.rating))) return false;
      if (state.year && readYear(b) !== Number(state.year)) return false;
      return matches(state.q, b.title, b.author, (b.isbn || '').replace(/\D/g, ''), b.isbn);
    });
    const dir = state.dir === 'asc' ? 1 : -1;
    const cmp = {
      recent: (a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''),
      title: (a, b) => a.title.localeCompare(b.title, 'pt'),
      author: (a, b) => (a.author || '').localeCompare(b.author || '', 'pt'),
      date: (a, b) => (a.endDate || a.startDate || '').localeCompare(b.endDate || b.startDate || ''),
      rating: (a, b) => (a.rating || 0) - (b.rating || 0),
      pages: (a, b) => (Number(a.pages) || 0) - (Number(b.pages) || 0),
    }[state.sort];
    list.sort((a, b) => cmp(a, b) * dir);
    const target = $('[data-results]', root);
    if (!books.length) {
      target.innerHTML = String(emptyState('Há muitas histórias esperando por você.', 'Sua estante começa com a próxima página.', html`<a class="btn btn-primary" href="#/livro/novo">${icon('plus')} Cadastrar livro</a>`));
      return;
    }
    if (!list.length) {
      target.innerHTML = String(emptyState('Nenhum livro por aqui.', 'Experimente outra busca ou limpe os filtros.', html`<button class="btn btn-soft btn-sm" data-reset>Limpar filtros</button>`));
      return;
    }
    target.innerHTML = String(html`
      <p class="shelf-count">${list.length === 1 ? '1 livro' : `${list.length} livros`}</p>
      ${view === 'grid' ? html`<div class="shelf-grid">${list.map(b => html`
        <a class="book" href="#/livro/${b.id}">
          ${(b.favorite || b.memorable) ? html`<span class="book-flags">${b.favorite ? html`<span title="Favorito">${icon('heartFill')}</span>` : ''}${b.memorable ? html`<span title="Livro que ficou">${icon('sparkle')}</span>` : ''}</span>` : ''}
          ${cover(b, 'fill')}
          <span class="title">${b.title}</span>
          <span class="author">${b.author}</span>
          ${b.status === 'lendo' ? html`<span class="mini-progress">${progressBar(progressOf(b))}</span>` : b.rating ? stars(b.rating) : ''}
        </a>`)}</div>`
      : html`<div class="shelf-list">${list.map(b => html`
        <a class="book-row" href="#/livro/${b.id}">
          ${cover(b, 'sm')}
          <div class="info">
            <h4>${b.title}</h4>
            <p class="author">${b.author}</p>
            <div class="line"><span class="badge s-${b.status}">${STATUS[b.status]?.label}</span>${b.rating ? stars(b.rating) : ''}${b.favorite ? icon('heartFill') : ''}
              ${b.status === 'lendo' ? html`<span class="muted small">${progressOf(b)}%</span>` : b.endDate ? html`<span class="muted small">${fmtDate(b.endDate)}</span>` : ''}</div>
          </div>
        </a>`)}</div>`}
    `);
  };

  drawActive(); draw();

  root.oninput = e => { if (e.target.matches('[data-q]')) { state.q = e.target.value; draw(); } };
  root.onclick = async e => {
    const c = e.target.closest('[data-chip]');
    if (c) { state.quick = c.dataset.chip; root.querySelectorAll('[data-chip]').forEach(x => x.classList.toggle('active', x === c)); draw(); return; }
    if (e.target.closest('[data-view]')) { view = view === 'grid' ? 'list' : 'grid'; saveView(view); e.target.closest('[data-view]').innerHTML = icons[view === 'grid' ? 'list' : 'grid'].replace('<svg', '<svg class="ic" style="width:21px;height:21px"'); draw(); return; }
    const cl = e.target.closest('[data-clear]');
    if (cl) { const k = cl.dataset.clear; if (k === 'sort') { state.sort = 'recent'; state.dir = 'desc'; } else state[k] = ''; drawActive(); draw(); return; }
    if (e.target.closest('[data-reset]')) { Object.assign(state, { quick: 'todos', q: '', genre: '', format: '', rating: '', year: '', sort: 'recent', dir: 'desc' }); refresh(); return; }
    if (e.target.closest('[data-rmdemo]')) { const { removeDemo } = await import('../demo.js'); if (await removeDemo()) refresh(); return; }
    if (e.target.closest('[data-filters]')) {
      const { el, close } = openSheet(String(html`
        <form class="form">
          <label class="field"><span>Ordenar por</span><select name="sort">${Object.entries(SORTS).map(([k, l]) => html`<option value="${k}" ${state.sort === k ? raw('selected') : ''}>${l}</option>`)}</select></label>
          <div class="seg" role="radiogroup"><label><input type="radio" name="dir" value="desc" ${state.dir === 'desc' ? raw('checked') : ''}><span>Decrescente</span></label><label><input type="radio" name="dir" value="asc" ${state.dir === 'asc' ? raw('checked') : ''}><span>Crescente</span></label></div>
          <label class="field"><span>Gênero</span><select name="genre"><option value="">Todos</option>${genres.map(g => html`<option ${state.genre === g ? raw('selected') : ''}>${g}</option>`)}</select></label>
          <div class="grid-2">
            <label class="field"><span>Formato</span><select name="format"><option value="">Todos</option>${Object.entries(FORMATS).map(([k, l]) => html`<option value="${k}" ${state.format === k ? raw('selected') : ''}>${l}</option>`)}</select></label>
            <label class="field"><span>Nota mínima</span><select name="rating"><option value="">Qualquer</option>${[5, 4.5, 4, 3, 2, 1].map(r => html`<option value="${r}" ${String(state.rating) === String(r) ? raw('selected') : ''}>${String(r).replace('.', ',')} ★</option>`)}</select></label>
          </div>
          <label class="field"><span>Ano de leitura</span><select name="year"><option value="">Todos</option>${years.map(y => html`<option ${String(state.year) === String(y) ? raw('selected') : ''}>${y}</option>`)}</select></label>
          <div class="row-btns"><button type="button" class="btn btn-ghost" data-clearall>Limpar</button><button class="btn btn-primary">Aplicar</button></div>
        </form>`), { title: 'Filtrar e ordenar' });
      const f = el.querySelector('form');
      el.querySelector('[data-clearall]').onclick = () => { Object.assign(state, { genre: '', format: '', rating: '', year: '', sort: 'recent', dir: 'desc' }); close(); drawActive(); draw(); };
      f.onsubmit = ev => {
        ev.preventDefault();
        Object.assign(state, { sort: f.sort.value, dir: f.dir.value, genre: f.genre.value, format: f.format.value, rating: f.rating.value, year: f.year.value });
        close(); drawActive(); draw();
      };
    }
  };
}
