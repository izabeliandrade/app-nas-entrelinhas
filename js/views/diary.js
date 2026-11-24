import * as db from '../db.js';
import { html, raw, icon, icons, matches, yearOf, MONTHS, parseDate, esc, $ } from '../utils.js';
import { emptyState, pageHeader, openSheet } from '../ui.js';
import { entryCard, reviewCard } from './home.js';
import { getFeelings } from '../model.js';

const st = {
  tab: 'pensamentos',
  e: { q: '', book: '', feeling: '', tag: '' },
  r: { q: '', book: '', author: '', year: '', rating: '', order: 'desc' },
};

export async function render({ root, query, refresh }) {
  if (query.tab) st.tab = query.tab;
  const [books, entries, reviews] = await Promise.all(['books', 'entries', 'reviews'].map(s => db.all(s)));
  const bmap = new Map(books.map(b => [b.id, b]));

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Diário', kicker: 'Meus escritos', actions: html`<button class="icon-btn" data-filter aria-label="Filtrar">${icon('filter')}</button>` })}
    <div class="seg" style="margin-bottom:16px" role="tablist">
      <button class="${st.tab === 'pensamentos' ? 'active' : ''}" data-tab="pensamentos" role="tab">Entre pensamentos</button>
      <button class="${st.tab === 'resenhas' ? 'active' : ''}" data-tab="resenhas" role="tab">O que escrevi</button>
    </div>
    <div class="searchbar" style="margin-bottom:12px"><span class="ic">${raw(icons.search)}</span><input type="search" data-q placeholder="Buscar por palavras" aria-label="Buscar"></div>
    <div class="active-filters" data-active></div>
    <div data-out></div>
    <a class="fab" data-new href="#" aria-label="Escrever">${icon('feather')}</a>
  `);
  const out = $('[data-out]', root);
  const qInput = $('[data-q]', root);
  const newBtn = $('[data-new]', root);

  const drawActive = () => {
    const s = st.tab === 'pensamentos' ? st.e : st.r;
    const labels = [];
    if (s.book) labels.push(['book', s.book === '__none' ? 'Registros livres' : bmap.get(s.book)?.title || 'livro']);
    if (s.feeling) labels.push(['feeling', s.feeling]);
    if (s.tag) labels.push(['tag', '#' + s.tag]);
    if (s.author) labels.push(['author', s.author]);
    if (s.year) labels.push(['year', s.year]);
    if (s.rating) labels.push(['rating', `nota ≥ ${s.rating}`]);
    if (s.order === 'asc') labels.push(['order', 'mais antigas primeiro']);
    $('[data-active]', root).innerHTML = labels.map(([k, l]) => `<button data-clear="${k}">${esc(l)} <span class="ic">${icons.close}</span></button>`).join('');
  };

  const draw = () => {
    const isE = st.tab === 'pensamentos';
    const s = isE ? st.e : st.r;
    qInput.value = s.q;
    newBtn.setAttribute('href', isE ? '#/pensamento/novo' : '#/resenha/nova');
    newBtn.setAttribute('aria-label', isE ? 'Novo pensamento' : 'Nova resenha');
    drawActive();
    if (isE) {
      const list = entries.filter(e => (e.text || '').trim()).filter(e => {
        const b = bmap.get(e.bookId);
        if (s.book === '__none' && e.bookId) return false;
        if (s.book && s.book !== '__none' && e.bookId !== s.book) return false;
        if (s.feeling && e.feeling !== s.feeling) return false;
        if (s.tag && !(e.tags || []).includes(s.tag)) return false;
        return matches(s.q, e.text, e.tags, b?.title, b?.author, e.feeling);
      }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
      if (!entries.length) { out.innerHTML = String(emptyState('Às vezes, as palavras ficam dentro de nós antes de encontrarem o papel.', 'Registre reflexões, teorias, sentimentos e perguntas — durante a leitura ou depois dela.', html`<a class="btn btn-primary" href="#/pensamento/novo">${icon('feather')} Escrever o primeiro</a>`)); return; }
      if (!list.length) { out.innerHTML = String(emptyState('Nada encontrado.', 'Tente outras palavras ou limpe os filtros.')); return; }
      let lastKey = '';
      out.innerHTML = String(html`<div class="timeline">${list.map(e => {
        const d = parseDate(e.date); const key = d ? `${d.getFullYear()}-${d.getMonth()}` : '';
        const head = key !== lastKey ? html`<p class="tl-month">${d ? `${MONTHS[d.getMonth()]} de ${d.getFullYear()}` : 'sem data'}</p>` : '';
        lastKey = key;
        return html`${head}${entryCard(e, bmap.get(e.bookId))}`;
      })}</div>`);
    } else {
      const list = reviews.filter(r => (r.text || '').trim() || r.title).filter(r => {
        const b = bmap.get(r.bookId);
        if (s.book && r.bookId !== s.book) return false;
        if (s.author && b?.author !== s.author) return false;
        if (s.year && yearOf(r.date) !== Number(s.year)) return false;
        if (s.rating && !((r.rating || b?.rating || 0) >= Number(s.rating))) return false;
        return matches(s.q, r.title, r.text, r.tags, b?.title, b?.author);
      }).sort((a, b) => ((a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || '')) * (s.order === 'asc' ? 1 : -1));
      if (!reviews.length) { out.innerHTML = String(emptyState('Às vezes, as palavras ficam dentro de nós antes de encontrarem o papel.', 'Quando estiver pronta, este é o seu espaço — sem perguntas, sem moldes.', html`<a class="btn btn-primary" href="#/resenha/nova">${icon('feather')} Escrever resenha</a>`)); return; }
      if (!list.length) { out.innerHTML = String(emptyState('Nenhuma resenha encontrada.', 'Tente outras palavras ou limpe os filtros.')); return; }
      out.innerHTML = String(html`<div class="review-grid">${list.map(r => reviewCard(r, bmap.get(r.bookId)))}</div>`);
    }
  };
  draw();

  root.oninput = e => { if (e.target.matches('[data-q]')) { (st.tab === 'pensamentos' ? st.e : st.r).q = e.target.value; draw(); } };
  root.onclick = async e => {
    const t = e.target.closest('[data-tab]');
    if (t) { st.tab = t.dataset.tab; root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === t)); draw(); return; }
    const c = e.target.closest('[data-clear]');
    if (c) { const s = st.tab === 'pensamentos' ? st.e : st.r; s[c.dataset.clear] = c.dataset.clear === 'order' ? 'desc' : ''; draw(); return; }
    if (e.target.closest('[data-filter]')) {
      const isE = st.tab === 'pensamentos';
      const s = isE ? st.e : st.r;
      const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');
      const relBooks = books.filter(b => (isE ? entries : reviews).some(x => x.bookId === b.id)).sort((a, b) => a.title.localeCompare(b.title, 'pt'));
      let body;
      if (isE) {
        const feelings = [...new Set([...(await getFeelings()), ...entries.map(x => x.feeling).filter(Boolean)])];
        const tags = [...new Set(entries.flatMap(x => x.tags || []))].sort();
        body = html`
          <label class="field"><span>Livro</span><select name="book"><option value="">Todos</option><option value="__none" ${sel(s.book, '__none')}>Registros livres (sem livro)</option>${relBooks.map(b => html`<option value="${b.id}" ${sel(s.book, b.id)}>${b.title}</option>`)}</select></label>
          <label class="field"><span>Sentimento</span><select name="feeling"><option value="">Todos</option>${feelings.map(f => html`<option ${sel(s.feeling, f)}>${f}</option>`)}</select></label>
          <label class="field"><span>Tag</span><select name="tag"><option value="">Todas</option>${tags.map(t => html`<option ${sel(s.tag, t)}>${t}</option>`)}</select></label>`;
      } else {
        const authors = [...new Set(relBooks.map(b => b.author).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
        const years = [...new Set(reviews.map(r => yearOf(r.date)).filter(Boolean))].sort((a, b) => b - a);
        body = html`
          <label class="field"><span>Livro</span><select name="book"><option value="">Todos</option>${relBooks.map(b => html`<option value="${b.id}" ${sel(s.book, b.id)}>${b.title}</option>`)}</select></label>
          <label class="field"><span>Autor(a)</span><select name="author"><option value="">Todos</option>${authors.map(a => html`<option ${sel(s.author, a)}>${a}</option>`)}</select></label>
          <div class="grid-2">
            <label class="field"><span>Ano</span><select name="year"><option value="">Todos</option>${years.map(y => html`<option ${sel(s.year, y)}>${y}</option>`)}</select></label>
            <label class="field"><span>Nota mínima</span><select name="rating"><option value="">Qualquer</option>${[5, 4.5, 4, 3, 2, 1].map(r => html`<option value="${r}" ${sel(s.rating, r)}>${String(r).replace('.', ',')} ★</option>`)}</select></label>
          </div>
          <label class="field"><span>Ordem</span><select name="order"><option value="desc" ${sel(s.order, 'desc')}>Mais recentes primeiro</option><option value="asc" ${sel(s.order, 'asc')}>Mais antigas primeiro</option></select></label>`;
      }
      const { el, close } = openSheet(String(html`<form class="form">${body}<div class="row-btns"><button type="button" class="btn btn-ghost" data-reset>Limpar</button><button class="btn btn-primary">Aplicar</button></div></form>`), { title: 'Filtrar' });
      const f = el.querySelector('form');
      el.querySelector('[data-reset]').onclick = () => { Object.keys(s).forEach(k => { if (k !== 'q') s[k] = k === 'order' ? 'desc' : ''; }); close(); draw(); };
      f.onsubmit = ev => { ev.preventDefault(); new FormData(f).forEach((v, k) => { s[k] = v; }); close(); draw(); };
    }
  };
}
