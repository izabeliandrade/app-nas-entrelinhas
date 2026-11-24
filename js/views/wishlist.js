import * as db from '../db.js';
import { html, raw, icon, icons, matches, fmtDate, $ } from '../utils.js';
import { cover, emptyState, pageHeader, tagList, confirmDialog, toast, openSheet } from '../ui.js';
import { PRIORITY } from '../model.js';
import { startReading } from '../actions.js';

const st = { q: '', prio: '', genre: '', sort: 'priority' };
const PR = { alta: 0, media: 1, baixa: 2 };

export async function render({ root, refresh, go }) {
  const all = await db.all('books');
  const items = all.filter(b => b.status === 'quero-ler');
  const genres = [...new Set(items.map(b => b.genre).filter(Boolean))].sort();

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Próximas páginas', kicker: 'Lista de desejos', back: true, actions: html`<a class="icon-btn" href="#/livro/novo?status=quero-ler" aria-label="Adicionar livro">${icon('plus')}</a>` })}
    ${items.length ? html`
      <div class="toolbar">
        <div class="searchbar"><span class="ic">${raw(icons.search)}</span><input type="search" data-q value="${st.q}" placeholder="Buscar" aria-label="Buscar na lista de desejos"></div>
        <button class="icon-btn bordered" data-sort aria-label="Ordenar e filtrar">${icon('sort')}</button>
      </div>
      <div class="chips" style="margin-bottom:8px">${[['', 'Todas'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']].map(([k, l]) => html`<button class="chip ${st.prio === k ? 'active' : ''}" data-prio="${k}">${k ? `Prioridade ${l.toLowerCase()}` : 'Todas'}</button>`)}</div>` : ''}
    <div data-out></div>
  `);

  const draw = () => {
    const out = $('[data-out]', root);
    if (!items.length) { out.innerHTML = String(emptyState('Toda leitora tem uma pilha de “um dia eu leio”.', 'Guarde aqui os livros que estão esperando a vez deles.', html`<a class="btn btn-primary" href="#/livro/novo?status=quero-ler">${icon('plus')} Adicionar desejo</a>`)); return; }
    const cmp = {
      priority: (a, b) => (PR[a.priority] ?? 1) - (PR[b.priority] ?? 1) || (b.addedAt || '').localeCompare(a.addedAt || ''),
      added: (a, b) => (b.addedAt || b.createdAt || '').localeCompare(a.addedAt || a.createdAt || ''),
      title: (a, b) => a.title.localeCompare(b.title, 'pt'),
      author: (a, b) => (a.author || '').localeCompare(b.author || '', 'pt'),
    }[st.sort];
    const list = items.filter(b => (!st.prio || b.priority === st.prio) && (!st.genre || b.genre === st.genre) && matches(st.q, b.title, b.author, b.wishReason, b.tags, b.genre)).sort(cmp);
    out.innerHTML = list.length ? String(html`${list.map(b => html`
      <div class="wish">
        <a href="#/livro/${b.id}">${cover(b, 'fill')}</a>
        <div>
          <a href="#/livro/${b.id}" style="text-decoration:none"><h4>${b.title}</h4></a>
          <p class="by">${b.author}${b.genre ? ` · ${b.genre}` : ''}</p>
          ${b.wishReason ? html`<p class="why">“${b.wishReason}”</p>` : ''}
          ${b.tags?.length ? html`<div style="margin-top:8px">${tagList(b.tags)}</div>` : ''}
          <div class="actions">
            <span class="prio prio-${b.priority || 'media'}">${PRIORITY[b.priority || 'media']}</span>
            <span class="muted small" style="margin-right:auto">desde ${fmtDate(b.addedAt || b.createdAt, 'month')}</span>
            <button class="btn btn-primary btn-sm" data-start="${b.id}">${icon('book')} Começar</button>
            <button class="icon-btn" data-opts="${b.id}" aria-label="Mais opções">${icon('more')}</button>
          </div>
        </div>
      </div>`)}`) : String(emptyState('Nada encontrado.', 'Tente outra busca ou outro filtro.'));
  };
  draw();

  root.oninput = e => { if (e.target.matches('[data-q]')) { st.q = e.target.value; draw(); } };
  root.onclick = async e => {
    const p = e.target.closest('[data-prio]');
    if (p) { st.prio = p.dataset.prio; root.querySelectorAll('[data-prio]').forEach(x => x.classList.toggle('active', x === p)); draw(); return; }
    const s = e.target.closest('[data-start]');
    if (s) { const b = items.find(x => x.id === s.dataset.start); await startReading(b); go(`#/livro/${b.id}`); return; }
    const o = e.target.closest('[data-opts]');
    if (o) {
      const b = items.find(x => x.id === o.dataset.opts);
      const { el, close } = openSheet(String(html`<div class="option-list">
        ${Object.entries(PRIORITY).map(([k, l]) => html`<button data-setp="${k}" class="${b.priority === k ? 'sel' : ''}"><span class="ic">${raw(icons.flame)}</span><span style="flex:1">Prioridade ${l.toLowerCase()}</span>${b.priority === k ? html`<span class="ic check">${raw(icons.check)}</span>` : ''}</button>`)}
        <a href="#/livro/${b.id}/editar"><span class="ic">${raw(icons.edit)}</span>Editar</a>
        <button class="danger" data-rm><span class="ic">${raw(icons.trash)}</span>Excluir da lista</button></div>`), { title: b.title });
      el.onclick = async ev => {
        const sp = ev.target.closest('[data-setp]');
        if (sp) { b.priority = sp.dataset.setp; await db.put('books', b); close(); toast('Prioridade atualizada'); refresh(); }
        if (ev.target.closest('[data-rm]')) {
          close();
          if (!(await confirmDialog({ title: 'Excluir da lista?', message: `“${b.title}” será removido.` }))) return;
          await db.removeBookCascade(b.id); toast('Livro removido'); refresh();
        }
      };
      return;
    }
    if (e.target.closest('[data-sort]')) {
      const sel = (a, b) => (a === b ? raw('selected') : '');
      const { el, close } = openSheet(String(html`<form class="form">
        <label class="field"><span>Ordenar por</span><select name="sort"><option value="priority" ${sel(st.sort, 'priority')}>Prioridade</option><option value="added" ${sel(st.sort, 'added')}>Data em que adicionei</option><option value="title" ${sel(st.sort, 'title')}>Título</option><option value="author" ${sel(st.sort, 'author')}>Autor</option></select></label>
        <label class="field"><span>Gênero</span><select name="genre"><option value="">Todos</option>${genres.map(g => html`<option ${sel(st.genre, g)}>${g}</option>`)}</select></label>
        <div class="row-btns"><button class="btn btn-primary">Aplicar</button></div></form>`), { title: 'Ordenar e filtrar' });
      el.querySelector('form').onsubmit = ev => { ev.preventDefault(); st.sort = ev.target.sort.value; st.genre = ev.target.genre.value; close(); draw(); };
    }
  };
}
