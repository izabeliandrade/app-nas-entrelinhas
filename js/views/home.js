import * as db from '../db.js';
import { html, raw, icon, fmtDate, WEEKDAYS, MONTHS, excerpt, yearOf, parseDate, plural } from '../utils.js';
import { cover, stars, progressBar, emptyState } from '../ui.js';
import { progressOf, readYear, getGoal, LITERARY_LINES, daySeed, computeStats } from '../model.js';
import { updateProgress } from '../actions.js';

let currentIndex = 0;

export async function render({ root, refresh }) {
  const [books, reviews, entries, quotes] = await Promise.all(['books', 'reviews', 'entries', 'quotes'].map(s => db.all(s)));
  const name = await db.getSetting('name', '');
  const photo = await db.getSetting('photo', '');
  const homeArt = await db.getSetting('homeArt', 'default');
  const homePhoto = homeArt === 'photo' ? await db.getSetting('homeArtPhoto', '') : '';
  const year = new Date().getFullYear();
  const goal = await getGoal(year);
  const bmap = new Map(books.map(b => [b.id, b]));

  const now = new Date();
  const h = now.getHours();
  const greet = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  const reading = books.filter(b => b.status === 'lendo').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  if (currentIndex >= reading.length) currentIndex = 0;
  const cur = reading[currentIndex];

  const stats = computeStats(books, year);
  const goalPct = goal ? Math.min(100, Math.round(stats.doneCount / goal * 100)) : 0;
  const finished = books.filter(b => b.status === 'concluido').sort((a, b) => (b.endDate || '').localeCompare(a.endDate || '')).slice(0, 8);
  const lastReviews = reviews.filter(r => (r.text || '').trim()).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 3);
  const lastEntries = entries.filter(e => (e.text || '').trim()).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 3);

  // frase para hoje: preferir citações salvas (favoritas primeiro)
  const favQuotes = quotes.filter(q => q.favorite);
  const pool = favQuotes.length ? favQuotes : quotes;
  let line;
  if (pool.length) {
    const q = pool[daySeed() % pool.length];
    const b = bmap.get(q.bookId);
    line = { text: q.text, author: q.author || b?.author || q.bookAuthor || '', book: b?.title || q.bookTitle || '', own: true };
  } else line = LITERARY_LINES[daySeed() % LITERARY_LINES.length];

  const yearEntries = entries.filter(e => yearOf(e.date) === year).length;
  const yearQuotes = quotes.filter(q => yearOf(q.date) === year).length;
  const isEmpty = !books.length && !entries.length && !quotes.length;

  root.innerHTML = String(html`
    <div class="home-top">
      <span class="brand">Nas Entrelinhas</span>
      <a class="avatar" href="#/perfil" aria-label="Perfil e configurações">${photo ? html`<img src="${photo}" alt="">` : icon('user')}</a>
    </div>

    <section class="hero">
      <p class="date">${WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}</p>
      <h1>${greet}${name ? html`, <em>${name}</em>` : ''}.</h1>
      <p class="subtitle">Entre histórias, pensamentos e tudo aquilo que permanece.</p>
      ${homeArt === 'photo' && homePhoto ? html`<div class="home-photo"><svg class="flora" viewBox="0 0 240 320" aria-hidden="true"><use href="#floral-sprig"/></svg><img src="${homePhoto}" alt="Minha imagem da tela inicial"></div>`
        : homeArt !== 'none' ? html`<div class="home-art"><img src="img/livro-florido.svg" alt="Livro aberto com flores nascendo das páginas"></div>` : ''}
    </section>

    ${isEmpty ? html`
      <div class="card" style="margin-top:24px">
        ${emptyState('Há muitas histórias esperando por você.', 'Sua estante começa com a próxima página.', html`
          <div class="row-btns" style="justify-content:center;flex-direction:column;align-items:stretch;width:100%;max-width:280px">
            <a class="btn btn-primary" href="#/livro/novo">${icon('plus')} Cadastrar meu primeiro livro</a>
            <button class="btn btn-ghost btn-sm" data-demo>Explorar com dados de exemplo</button>
          </div>`)}
      </div>` : ''}

    ${!isEmpty ? html`
    <section class="section">
      <div class="section-head"><h2>Minha leitura <em>atual</em></h2>${reading.length ? html`<a href="#/estante?f=lendo">${reading.length > 1 ? `${reading.length} em andamento` : 'ver estante'}</a>` : ''}</div>
      ${cur ? html`
        <div class="card">
          <div class="current">
            <a href="#/livro/${cur.id}">${cover(cur, 'md')}</a>
            <div class="current-info">
              <h3>${cur.title}</h3>
              <p class="author">${cur.author}</p>
              <p class="pct">${progressOf(cur)}%<small>${cur.pages ? `pág. ${cur.currentPage || 0} de ${cur.pages}` : 'total de páginas não informado'}</small></p>
              ${progressBar(progressOf(cur), 'thick')}
              <div class="current-actions">
                <button class="btn btn-primary btn-sm" data-progress="${cur.id}">${icon('bookmark')} Atualizar página</button>
                <a class="btn btn-ghost btn-sm" href="#/livro/${cur.id}">Abrir</a>
              </div>
            </div>
          </div>
          ${reading.length > 1 ? html`<div class="current-switch" aria-label="Outras leituras em andamento">${reading.map((b, i) => html`<button data-switch="${i}" class="${i === currentIndex ? 'active' : ''}" aria-label="${b.title}">${cover(b, 'xs')}</button>`)}</div>` : ''}
        </div>` : html`
        <div class="card-flat">${emptyState('Nenhuma leitura em andamento.', 'Escolha o próximo livro e deixe a história começar.', html`<div class="row-btns" style="justify-content:center"><a class="btn btn-soft btn-sm" href="#/proximas-paginas">Próximas páginas</a><a class="btn btn-primary btn-sm" href="#/livro/novo?status=lendo">${icon('plus')} Novo livro</a></div>`)}</div>`}
    </section>` : ''}

    <section class="section">
      <div class="quick-links">
        <a href="#/livro/novo">${icon('plus')} Novo livro</a>
        <a href="#/pensamento/novo${cur ? `?book=${cur.id}` : ''}">${icon('feather')} Escrever</a>
        <a href="#/fragmento/novo${cur ? `?book=${cur.id}` : ''}">${icon('quote')} Guardar trecho</a>
        <a href="#/proximas-paginas">${icon('bookmark')} Próximas páginas</a>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Uma frase <em>para hoje</em></h2>${line.own ? html`<a href="#/fragmentos">fragmentos</a>` : ''}</div>
      <div class="daily-quote">
        <svg class="flora" viewBox="0 0 240 320" aria-hidden="true"><use href="#floral-sprig"/></svg>
        <blockquote>${line.text}</blockquote>
        <cite>${line.author}${line.book ? html` · <i>${line.book}</i>` : ''}</cite>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Meta de ${year}</h2><button data-goal>ajustar</button></div>
      <div class="card goal">
        <div class="ring">
          <svg viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" cx="40" cy="40" r="34" stroke-dasharray="${2 * Math.PI * 34}" stroke-dashoffset="${2 * Math.PI * 34 * (1 - goalPct / 100)}"/></svg>
          <span class="lbl">${goalPct}%</span>
        </div>
        <div class="goal-text">
          <p class="big">${stats.doneCount} de ${goal} livros</p>
          <p>${stats.doneCount >= goal && goal ? 'Meta alcançada. Que ano bonito de leituras.' : goal ? `Faltam ${plural(Math.max(0, goal - stats.doneCount), 'livro', 'livros')} para a sua meta.` : 'Defina uma meta anual.'}</p>
        </div>
      </div>
    </section>

    ${finished.length ? html`
    <section class="section">
      <div class="section-head"><h2>Recentemente <em>concluídos</em></h2><a href="#/estante?f=concluido">ver todos</a></div>
      <div class="cover-row">${finished.map(b => html`<a href="#/livro/${b.id}">${cover(b, 'md')}<div class="meta"><b>${b.title}</b>${b.rating ? stars(b.rating) : html`<span class="muted">${fmtDate(b.endDate, 'month')}</span>`}</div></a>`)}</div>
    </section>` : ''}

    <section class="section">
      <div class="section-head"><h2>Entre <em>pensamentos</em></h2><a href="#/diario">diário</a></div>
      ${lastEntries.length ? html`<div class="timeline">${lastEntries.map(e => entryCard(e, bmap.get(e.bookId)))}</div>`
        : html`<div class="card-flat">${emptyState('Nenhum pensamento registrado ainda.', 'Escreva o que a leitura despertou, mesmo antes da última página.', html`<a class="btn btn-soft btn-sm" href="#/pensamento/novo">${icon('feather')} Escrever agora</a>`)}</div>`}
    </section>

    ${lastReviews.length ? html`
    <section class="section">
      <div class="section-head"><h2>O que <em>escrevi</em></h2><a href="#/diario?tab=resenhas">resenhas</a></div>
      <div class="review-grid">${lastReviews.map(r => reviewCard(r, bmap.get(r.bookId)))}</div>
    </section>` : ''}

    <section class="section">
      <div class="section-head"><h2>Minha <em>jornada</em> em ${year}</h2><a href="#/trajetoria">trajetória</a></div>
      <div class="card journey">
        <div><b>${stats.doneCount}</b><span>${stats.doneCount === 1 ? 'livro lido' : 'livros lidos'}</span></div>
        <div><b>${stats.totalPages.toLocaleString('pt-BR')}</b><span>páginas</span></div>
        <div><b>${yearEntries + yearQuotes}</b><span>registros</span></div>
      </div>
    </section>
    <div class="ornament"><span><svg viewBox="0 0 60 60" aria-hidden="true"><use href="#daisy"/></svg></span></div>
  `);

  root.onclick = async e => {
    const p = e.target.closest('[data-progress]');
    if (p) { const b = await db.get('books', p.dataset.progress); if (await updateProgress(b)) refresh(); return; }
    const s = e.target.closest('[data-switch]');
    if (s) { currentIndex = Number(s.dataset.switch); refresh(); return; }
    if (e.target.closest('[data-goal]')) {
      const { promptDialog, toast } = await import('../ui.js');
      const v = await promptDialog({ title: `Meta de ${year}`, label: 'Quantos livros você quer ler?', type: 'number', value: goal, min: 1 });
      if (v === null) return;
      const n = parseInt(v, 10);
      if (!n || n < 1) { toast('Informe um número maior que zero.', 'error'); return; }
      const goals = await db.getSetting('goals', {}); goals[year] = n; await db.setSetting('goals', goals);
      toast('Meta atualizada'); refresh(); return;
    }
    if (e.target.closest('[data-demo]')) {
      const { loadDemo } = await import('../demo.js');
      await loadDemo(); refresh();
    }
  };
}

export function entryCard(e, book) {
  return html`<a class="tl-item" href="#/pensamento/${e.id}">
    <div class="card-flat entry-card">
      <div class="head">${book ? cover(book, 'xs') : ''}<p class="t"><b>${book ? book.title : (e.bookTitle || 'Registro livre')}</b>${fmtDate(e.date, 'long')}${e.page ? ` · pág. ${e.page}` : ''}</p></div>
      <p class="text">${e.text}</p>
      ${(e.feeling || (e.tags && e.tags.length)) ? html`<div class="foot">${e.feeling ? feelChip(e.feeling) : ''}${(e.tags || []).map(t => html`<span class="tag">#${t}</span>`)}</div>` : ''}
    </div></a>`;
}

export function reviewCard(r, book) {
  return html`<a class="card-flat review-card" href="#/resenha/${r.id}">
    ${book ? cover(book, 'sm') : html`<div></div>`}
    <div style="min-width:0">
      <h4>${r.title || book?.title || 'Resenha'}</h4>
      <p class="by">${r.title && book ? html`<i>${book.title}</i> · ` : ''}${book?.author || ''}</p>
      <p class="ex">${excerpt(r.text, 200)}</p>
      <div class="line">${r.rating || book?.rating ? stars(r.rating || book?.rating) : ''}<span>${fmtDate(r.date, 'long')}</span></div>
    </div></a>`;
}

import { feelingTone } from '../model.js';
export function feelChip(f) { return html`<span class="feel" style="--tone:${feelingTone(f)}">${f}</span>`; }
