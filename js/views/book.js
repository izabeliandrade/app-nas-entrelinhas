import * as db from '../db.js';
import { html, raw, icon, icons, fmtDate, excerpt, $ } from '../utils.js';
import { cover, stars, progressBar, emptyState, tagList, openSheet, confirmDialog, toast, promptDialog } from '../ui.js';
import { STATUS, FORMATS, PRIORITY, progressOf } from '../model.js';
import { updateProgress, finishBook, startReading, setStatus } from '../actions.js';
import { entryCard, feelChip } from './home.js';
import { quoteCard } from './quotes.js';

const tabState = {};

export async function render({ root, params, query, refresh, go, back }) {
  const book = await db.get('books', params.id);
  if (!book) { root.innerHTML = String(emptyState('Este livro não está mais na estante.', '', html`<a class="btn btn-soft" href="#/estante">Ir para a estante</a>`)); return; }
  const [reviews, entries, quotes] = await Promise.all(['reviews', 'entries', 'quotes'].map(async s => (await db.all(s)).filter(i => i.bookId === book.id)));
  reviews.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  entries.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  quotes.sort((a, b) => (Number(a.page) || 0) - (Number(b.page) || 0));
  const tab = query.tab || tabState[book.id] || 'sobre';
  const pct = progressOf(book);
  const log = (book.progressLog || []).slice().reverse();

  const fiche = [
    ['Editora', book.publisher], ['Páginas', book.pages], ['Gênero', book.genre], ['Subgênero', book.subgenre],
    ['Formato', FORMATS[book.format]], ['Idioma', book.language], ['Início', fmtDate(book.startDate)], ['Conclusão', fmtDate(book.endDate)],
    ['ISBN', book.isbn],
  ].filter(([, v]) => v);

  root.innerHTML = String(html`
    <section class="book-hero">
      ${book.cover ? html`<div class="book-hero-bg" style="background-image:url('${book.cover}')"></div>` : ''}
      <div class="nav">
        <button class="icon-btn" data-back aria-label="Voltar">${icon('back')}</button>
        <div><a class="icon-btn" href="#/livro/${book.id}/editar" aria-label="Editar">${icon('edit')}</a><button class="icon-btn" data-more aria-label="Mais opções">${icon('more')}</button></div>
      </div>
      ${cover(book, 'lg')}
      <h1>${book.title}</h1>
      <p class="author">${book.author}</p>
      <div class="meta-line">
        <button class="badge s-${book.status}" data-status style="background:transparent;cursor:pointer">${STATUS[book.status]?.label} ${icon('chevronD')}</button>
        ${book.rating ? stars(book.rating) : ''}
      </div>
      <div class="book-actions">
        <button class="toggle-pill ${book.favorite ? 'on' : ''}" data-toggle="favorite">${icon(book.favorite ? 'heartFill' : 'heart')} Favorito</button>
        <button class="toggle-pill ${book.memorable ? 'on' : ''}" data-toggle="memorable">${icon('sparkle')} Livro que ficou</button>
      </div>
    </section>

    ${book.status === 'lendo' || book.status === 'pausado' ? html`
      <div class="card progress-card" style="margin-top:6px">
        <div class="top"><b>${pct}%</b><span class="muted small">${book.pages ? `página ${book.currentPage || 0} de ${book.pages}` : 'informe o total de páginas'}</span></div>
        ${progressBar(pct, 'thick')}
        <div class="row-btns" style="margin-top:14px">
          <button class="btn btn-primary btn-sm" data-progress>${icon('bookmark')} Atualizar página</button>
          <button class="btn btn-ghost btn-sm" data-finish>${icon('check')} Concluí</button>
        </div>
      </div>` : ''}
    ${book.status === 'quero-ler' ? html`<div class="row-btns" style="margin-top:4px"><button class="btn btn-primary" data-start>${icon('book')} Começar a ler agora</button></div>` : ''}

    <nav class="tabs" role="tablist" style="margin-top:22px">
      ${[['sobre', 'Sobre o livro'], ['resenha', 'Minha resenha', reviews.length], ['pensamentos', 'Entre pensamentos', entries.length], ['fragmentos', 'Fragmentos', quotes.length], ['historico', 'Histórico']].map(([k, l, n]) =>
        html`<button role="tab" data-tab="${k}" class="${tab === k ? 'active' : ''}" aria-selected="${tab === k}">${l}${n ? html`<span class="n">${n}</span>` : ''}</button>`)}
    </nav>

    <div data-panel="sobre" ${tab !== 'sobre' ? raw('hidden') : ''}>
      ${book.memorable && book.memorableReason ? html`<p class="memorable-note" style="margin-bottom:22px">${book.memorableReason}</p>` : ''}
      ${book.description ? html`<p class="description clamp" data-desc>${book.description}</p>${book.description.length > 380 ? html`<button class="link-btn" data-expand style="margin-top:6px">ler mais</button>` : ''}` : ''}
      ${fiche.length ? html`<dl class="fiche" style="margin-top:${book.description ? 22 : 0}px">${fiche.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}${fiche.length % 2 ? html`<div></div>` : ''}</dl>` : ''}
      ${book.status === 'quero-ler' && (book.wishReason || book.priority) ? html`<div class="section"><p class="field-label">Por que quero ler</p><p class="description" style="margin-top:6px">${book.wishReason || '—'}</p><p class="prio prio-${book.priority}" style="margin-top:8px">Prioridade ${PRIORITY[book.priority] || ''}</p></div>` : ''}
      ${book.feelings?.length ? html`<div class="section"><p class="field-label" style="margin-bottom:10px">O que senti</p><div class="tags">${book.feelings.map(feelChip)}</div></div>` : ''}
      ${book.tags?.length ? html`<div class="section"><p class="field-label" style="margin-bottom:10px">Tags</p>${tagList(book.tags)}</div>` : ''}
      ${book.notes ? html`<div class="section"><p class="field-label">Observações</p><p class="description" style="margin-top:6px">${book.notes}</p></div>` : ''}
      ${!book.description && !fiche.length && !book.notes ? html`<p class="muted center" style="padding:20px 0">Complete a ficha do livro em <a href="#/livro/${book.id}/editar">editar</a>.</p>` : ''}
    </div>

    <div data-panel="resenha" ${tab !== 'resenha' ? raw('hidden') : ''}>
      ${reviews.length ? html`${reviews.map(r => html`
        <a class="card-flat" href="#/resenha/${r.id}" style="display:block;text-decoration:none;margin-bottom:12px">
          ${r.title ? html`<h3 class="serif" style="font-size:24px;line-height:1.15">${r.title}</h3>` : ''}
          <div class="review-meta" style="margin-top:4px">${r.rating ? stars(r.rating) : ''}<span>${fmtDate(r.date, 'long')}</span></div>
          <p class="prose" style="margin-top:10px;line-height:1.7;color:var(--text-2)">${excerpt(r.text, 420)}</p>
          <span class="link-btn" style="display:inline-block;margin-top:10px">ler resenha completa</span>
        </a>`)}
        <a class="btn btn-ghost btn-sm" href="#/resenha/nova?book=${book.id}">${icon('plus')} Outra resenha</a>`
        : emptyState('Às vezes, as palavras ficam dentro de nós antes de encontrarem o papel.', '', html`<a class="btn btn-primary btn-sm" href="#/resenha/nova?book=${book.id}">${icon('feather')} Escrever resenha</a>`)}
    </div>

    <div data-panel="pensamentos" ${tab !== 'pensamentos' ? raw('hidden') : ''}>
      <a class="btn btn-soft btn-sm" href="#/pensamento/novo?book=${book.id}" style="margin-bottom:18px">${icon('feather')} Novo pensamento</a>
      ${entries.length ? html`<div class="timeline">${entries.map(e => entryCard(e, null))}</div>`
        : emptyState('Nenhum pensamento sobre este livro ainda.', 'Teorias, impressões, perguntas — tudo cabe aqui, mesmo no meio da leitura.')}
    </div>

    <div data-panel="fragmentos" ${tab !== 'fragmentos' ? raw('hidden') : ''}>
      <a class="btn btn-soft btn-sm" href="#/fragmento/novo?book=${book.id}" style="margin-bottom:18px">${icon('quote')} Guardar trecho</a>
      ${quotes.length ? html`<div class="quote-list">${quotes.map(q => quoteCard(q, book))}</div>`
        : emptyState('Nenhum trecho guardado deste livro.', 'Aquela frase que você sublinhou merece um lugar.')}
    </div>

    <div data-panel="historico" ${tab !== 'historico' ? raw('hidden') : ''}>
      <dl class="fiche" style="margin-bottom:20px">
        <div><dt>Adicionado</dt><dd>${fmtDate(book.addedAt || book.createdAt)}</dd></div>
        <div><dt>Início</dt><dd>${fmtDate(book.startDate) || '—'}</dd></div>
        <div><dt>Conclusão</dt><dd>${fmtDate(book.endDate) || '—'}</dd></div>
        <div><dt>Dias de leitura</dt><dd>${book.startDate && book.endDate ? Math.max(1, Math.round((new Date(book.endDate) - new Date(book.startDate)) / 864e5) + 1) : '—'}</dd></div>
      </dl>
      ${log.length ? html`<ul class="history">${log.map((l, i) => html`<li><span class="d">${fmtDate(l.date)}</span><span class="p">${l.note ? html`<b style="font-weight:500">${l.note}</b>${l.page ? ` · pág. ${l.page}` : ''}` : `Página ${l.page}${book.pages ? ` · ${Math.min(100, Math.round(l.page / book.pages * 100))}%` : ''}`}</span><button class="icon-btn" style="width:30px;height:30px" data-rmlog="${log.length - 1 - i}" aria-label="Remover registro">${icon('close')}</button></li>`)}</ul>`
        : html`<p class="muted center" style="padding:20px 0">O histórico de progresso aparecerá aqui.</p>`}
    </div>
  `);

  root.onclick = async e => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      tabState[book.id] = t.dataset.tab;
      root.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b === t); b.setAttribute('aria-selected', b === t); });
      root.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab);
      return;
    }
    if (e.target.closest('[data-expand]')) { $('[data-desc]', root).classList.remove('clamp'); e.target.closest('[data-expand]').remove(); return; }
    if (e.target.closest('[data-progress]')) { if (await updateProgress(book)) refresh(); return; }
    if (e.target.closest('[data-finish]')) { await finishBook(book); refresh(); return; }
    if (e.target.closest('[data-start]')) { await startReading(book); refresh(); return; }
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      const k = tg.dataset.toggle;
      book[k] = !book[k];
      if (k === 'memorable' && book[k] && !book.memorableReason) {
        const why = await promptDialog({ title: 'Um livro que ficou', label: 'O que fez este livro permanecer com você? (opcional)', confirm: 'Guardar' });
        if (why) book.memorableReason = why.trim();
      }
      await db.put('books', book);
      toast(k === 'favorite' ? (book.favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos') : (book.memorable ? 'Guardado entre os livros que ficaram' : 'Removido dos livros que ficaram'));
      refresh(); return;
    }
    const rl = e.target.closest('[data-rmlog]');
    if (rl) {
      if (!(await confirmDialog({ title: 'Remover este registro?', message: 'Apenas a anotação de progresso será removida.', confirm: 'Remover' }))) return;
      book.progressLog.splice(Number(rl.dataset.rmlog), 1); await db.put('books', book); refresh(); return;
    }
    if (e.target.closest('[data-status]')) {
      const { el, close } = openSheet(`<div class="option-list">${Object.entries(STATUS).map(([k, v]) => `<button data-s="${k}" class="${k === book.status ? 'sel' : ''}"><span style="flex:1">${v.label}</span>${k === book.status ? `<span class="ic check">${icons.check}</span>` : ''}</button>`).join('')}</div>`, { title: 'Status da leitura' });
      el.onclick = async ev => { const b = ev.target.closest('[data-s]'); if (!b) return; close(); if (b.dataset.s !== book.status) { await setStatus(book, b.dataset.s); refresh(); } };
      return;
    }
    if (e.target.closest('[data-more]')) {
      const { el, close } = openSheet(`<div class="option-list">
        <a href="#/livro/${book.id}/editar"><span class="ic">${icons.edit}</span>Editar informações</a>
        <a href="#/resenha/nova?book=${book.id}"><span class="ic">${icons.feather}</span>Escrever resenha</a>
        <a href="#/pensamento/novo?book=${book.id}"><span class="ic">${icons.diary}</span>Registrar pensamento</a>
        <a href="#/fragmento/novo?book=${book.id}"><span class="ic">${icons.quote}</span>Guardar fragmento</a>
        <button class="danger" data-del><span class="ic">${icons.trash}</span>Excluir livro</button></div>`, { title: book.title });
      el.querySelector('[data-del]').onclick = async () => {
        close();
        const extra = reviews.length ? ` As ${reviews.length === 1 ? 'resenha' : reviews.length + ' resenhas'} deste livro também serão excluídas. Pensamentos e fragmentos serão mantidos, sem vínculo.` : '';
        if (!(await confirmDialog({ title: 'Excluir este livro?', message: `“${book.title}” sairá da sua estante. Esta ação não pode ser desfeita.${extra}` }))) return;
        await db.removeBookCascade(book.id);
        toast('Livro excluído');
        go('#/estante', { replace: true });
      };
    }
  };
}
