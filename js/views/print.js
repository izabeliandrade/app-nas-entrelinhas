import * as db from '../db.js';
import { html, icon, fmtDate, todayISO } from '../utils.js';
import { cover, stars } from '../ui.js';
import { STATUS, FORMATS, computeStats, yearsWithData, getGoal } from '../model.js';
import { quoteCard } from './quotes.js';

const TITLES = { books: 'Minha biblioteca', reviews: 'O que escrevi', quotes: 'Fragmentos', entries: 'Entre pensamentos', stats: 'Minha trajetória' };

export async function render({ root, params }) {
  const kind = params.kind;
  const [books, reviews, entries, quotes] = await Promise.all(['books', 'reviews', 'entries', 'quotes'].map(s => db.all(s)));
  const bmap = new Map(books.map(b => [b.id, b]));
  const name = await db.getSetting('name', '');
  let body;
  if (kind === 'books') {
    body = books.slice().sort((a, b) => a.title.localeCompare(b.title, 'pt')).map(b => html`<div class="item" style="display:flex;gap:14px">${cover(b, 'sm')}<div>
      <h3>${b.title}</h3><p>${b.author}${b.publisher ? ` · ${b.publisher}` : ''}${b.pages ? ` · ${b.pages} p.` : ''}</p>
      <p>${STATUS[b.status]?.label}${b.format ? ` · ${FORMATS[b.format]}` : ''}${b.startDate ? ` · início ${fmtDate(b.startDate)}` : ''}${b.endDate ? ` · conclusão ${fmtDate(b.endDate)}` : ''}</p>
      ${b.rating ? stars(b.rating) : ''}${b.notes ? html`<p class="body">${b.notes}</p>` : ''}</div></div>`);
  } else if (kind === 'reviews') {
    body = reviews.filter(r => (r.text || '').trim()).sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(r => { const b = bmap.get(r.bookId); return html`<div class="item"><h3>${r.title || b?.title || 'Resenha'}</h3><p>${b ? `${b.title} — ${b.author} · ` : ''}${fmtDate(r.date, 'long')}${r.rating ? ` · ${String(r.rating).replace('.', ',')} ★` : ''}</p><div class="body">${r.text}</div></div>`; });
  } else if (kind === 'entries') {
    body = entries.filter(e => (e.text || '').trim()).sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(e => { const b = bmap.get(e.bookId); return html`<div class="item"><p><b>${fmtDate(e.date, 'long')}</b>${b ? ` · ${b.title}` : e.bookTitle ? ` · ${e.bookTitle}` : ''}${e.page ? ` · p. ${e.page}` : ''}${e.feeling ? ` · ${e.feeling}` : ''}</p><div class="body">${e.text}</div></div>`; });
  } else if (kind === 'quotes') {
    body = html`<div class="quote-list">${quotes.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(q => quoteCard(q, bmap.get(q.bookId)))}</div>`;
  } else if (kind === 'stats') {
    const years = yearsWithData(books, reviews, entries, quotes);
    const rows = [];
    for (const y of years) rows.push([y, computeStats(books, y, { reviews, quotes }), await getGoal(y)]);
    const all = computeStats(books, null);
    body = html`<div class="item"><h3>Visão geral</h3><p>${books.length} livros cadastrados · ${all.doneCount} concluídos · ${all.totalPages.toLocaleString('pt-BR')} páginas · média ${all.avgRating ? all.avgRating.toFixed(1).replace('.', ',') : '—'}</p></div>
      ${rows.map(([y, s, g]) => html`<div class="item"><h3>${y}</h3><p>${s.doneCount} de ${g} livros (meta) · ${s.totalPages.toLocaleString('pt-BR')} páginas · média de notas ${s.avgRating ? s.avgRating.toFixed(1).replace('.', ',') : '—'}</p>
        <p>Gênero mais lido: ${s.genres[0]?.[0] || '—'} · Autor mais lido: ${s.authors[0]?.[0] || '—'} · Mais longo: ${s.longest?.title || '—'} · Mais curto: ${s.shortest?.title || '—'}</p></div>`)}`;
  } else body = html`<p>Tipo de exportação desconhecido.</p>`;

  const empty = Array.isArray(body) && !body.length;
  root.innerHTML = String(html`
    <header class="page-head with-back no-print"><button class="icon-btn" data-back aria-label="Voltar">${icon('back')}</button><div class="page-head-text"><p class="kicker" style="margin:0">Exportar em PDF</p></div>
      <div class="page-head-actions"><button class="btn btn-primary btn-sm" data-print ${empty ? 'disabled' : ''}>${icon('print')} Salvar PDF</button></div></header>
    <div class="print-doc">
      <p class="kicker">Nas Entrelinhas${name ? ` · ${name}` : ''} · ${fmtDate(todayISO(), 'long')}</p>
      <h1 class="serif" style="font-size:34px;margin-bottom:16px">${TITLES[kind] || ''}</h1>
      ${empty ? html`<p class="muted">Ainda não há nada para exportar aqui.</p>` : body}
    </div>
  `);
  root.onclick = e => { if (e.target.closest('[data-print]')) window.print(); };
}
