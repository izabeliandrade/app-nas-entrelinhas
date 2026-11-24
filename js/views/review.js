import * as db from '../db.js';
import { html, icon, fmtDate } from '../utils.js';
import { cover, stars, emptyState, tagList, confirmDialog, toast } from '../ui.js';

export async function render({ root, params, go }) {
  const r = await db.get('reviews', params.id);
  if (!r) { root.innerHTML = String(emptyState('Esta resenha não existe mais.', '', html`<a class="btn btn-soft" href="#/diario?tab=resenhas">Ver resenhas</a>`)); return; }
  const book = r.bookId ? await db.get('books', r.bookId) : null;
  const words = (r.text.trim().match(/\S+/g) || []).length;
  root.innerHTML = String(html`
    <header class="page-head with-back">
      <button class="icon-btn" data-back aria-label="Voltar">${icon('back')}</button>
      <div class="page-head-text"><p class="kicker" style="margin:0">O que escrevi</p></div>
      <div class="page-head-actions">
        <a class="icon-btn" href="#/resenha/${r.id}/editar" aria-label="Editar">${icon('edit')}</a>
        <button class="icon-btn" data-del aria-label="Excluir">${icon('trash')}</button>
      </div>
    </header>
    ${book ? html`<a class="review-book" href="#/livro/${book.id}">${cover(book, 'sm')}<div><h4>${book.title}</h4><p class="muted small">${book.author}</p></div></a>` : ''}
    <article class="review-read">
      ${r.title ? html`<h1 class="rtitle">${r.title}</h1>` : ''}
      <div class="review-meta">${r.rating ? stars(r.rating) : ''}<span>${fmtDate(r.date, 'long')}</span><span>·</span><span>${words} palavras</span></div>
      <div class="body">${r.text}</div>
      ${r.tags?.length ? html`<div style="margin-top:24px">${tagList(r.tags)}</div>` : ''}
    </article>
    <div class="ornament"><span><svg viewBox="0 0 60 60" aria-hidden="true"><use href="#daisy"/></svg></span></div>
    <a class="btn btn-ghost btn-block" href="#/resenha/${r.id}/editar">${icon('feather')} Continuar escrevendo</a>
  `);
  root.onclick = async e => {
    if (e.target.closest('[data-del]')) {
      if (!(await confirmDialog({ title: 'Excluir esta resenha?', message: 'O texto será apagado definitivamente.' }))) return;
      await db.remove('reviews', r.id); toast('Resenha excluída');
      go(book ? `#/livro/${book.id}` : '#/diario?tab=resenhas', { replace: true });
    }
  };
}
