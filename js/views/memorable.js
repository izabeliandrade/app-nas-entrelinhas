import * as db from '../db.js';
import { html, icon, fmtDate, excerpt } from '../utils.js';
import { cover, stars, pageHeader, emptyState } from '../ui.js';
import { feelingTone } from '../model.js';

export async function render({ root }) {
  const [books, reviews] = await Promise.all([db.all('books'), db.all('reviews')]);
  const list = books.filter(b => b.memorable).sort((a, b) => (b.endDate || b.updatedAt || '').localeCompare(a.endDate || a.updatedAt || ''));
  root.innerHTML = String(html`
    ${pageHeader({ title: 'Livros que ficaram', kicker: 'Leituras marcantes', back: true })}
    <p class="mem-intro">Livros que, mesmo depois da última página, permaneceram comigo.</p>
    ${list.length ? html`<div class="memorable-shelf">${list.map(b => {
      const r = reviews.filter(x => x.bookId === b.id && (x.text || '').trim()).sort((a, c) => (c.date || '').localeCompare(a.date || ''))[0];
      return html`<a class="mem-item" href="#/livro/${b.id}">
        ${cover(b, 'lg')}
        <div>
          <h4>${b.title}</h4>
          <p class="by">${b.author}${b.endDate ? ` · lido em ${fmtDate(b.endDate, 'long')}` : ''}</p>
          ${b.rating ? stars(b.rating) : ''}
          ${b.memorableReason ? html`<p class="why">“${b.memorableReason}”</p>` : ''}
          ${b.feelings?.length ? html`<div class="tags" style="margin-top:10px">${b.feelings.map(f => html`<span class="feel" style="--tone:${feelingTone(f)}">${f}</span>`)}</div>` : ''}
          ${r ? html`<p class="prose small" style="margin-top:10px;color:var(--text-2);line-height:1.6">${excerpt(r.text, 150)}</p>` : ''}
        </div></a>`;
    })}</div>` : emptyState('Alguns livros não terminam na última página.', 'Na página de um livro, toque em “Livro que ficou” para guardá-lo aqui, com o motivo pelo qual ele te marcou.', html`<a class="btn btn-soft" href="#/estante?f=concluido">Ver livros concluídos</a>`)}
    <div class="ornament"><span><svg viewBox="0 0 60 60" aria-hidden="true"><use href="#daisy"/></svg></span></div>
  `);
}
