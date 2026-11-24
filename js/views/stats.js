import * as db from '../db.js';
import { html, raw, icon, plural } from '../utils.js';
import { cover, stars, pageHeader, progressBar, emptyState } from '../ui.js';
import { computeStats, yearsWithData, getGoal, isRead, feelingTone } from '../model.js';
import { monthBars, hbars, ratingBars } from '../charts.js';

let selYear = new Date().getFullYear();

export async function render({ root, refresh }) {
  const [books, reviews, entries, quotes] = await Promise.all(['books', 'reviews', 'entries', 'quotes'].map(s => db.all(s)));
  const years = yearsWithData(books, reviews, entries, quotes);
  const year = selYear === 'all' ? null : Number(selYear);
  const s = computeStats(books, year, { reviews, quotes });
  const goal = year ? await getGoal(year) : null;
  const goalPct = goal ? Math.min(100, Math.round(s.doneCount / goal * 100)) : 0;
  const allDone = books.filter(isRead).length;
  const fmt = n => n.toLocaleString('pt-BR');

  const hl = (k, b, sub) => b ? html`<a class="highlight-book" href="#/livro/${b.id}">${cover(b, 'xs')}<div style="flex:1;min-width:0"><p class="k">${k}</p><h4>${b.title}</h4><p class="s">${sub}</p></div></a>` : '';

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Minha trajetória', kicker: 'Uma leitora em evolução' })}

    <div class="menu-cards">
      <a class="menu-card wide" href="#/retrospectiva/${year || new Date().getFullYear()}">${icon('sparkle')}<div><h4>Retrospectiva</h4><p>Seu ano em forma de revista literária.</p></div>${icon('chevronR')}</a>
      <a class="menu-card" href="#/mapa-emocional">${icon('leaf')}<h4>Mapa emocional</h4><p>O que os livros me fizeram sentir.</p></a>
      <a class="menu-card" href="#/livros-que-ficaram">${icon('bookmark')}<h4>Livros que ficaram</h4><p>Depois da última página.</p></a>
      <a class="menu-card" href="#/calendario">${icon('calendar')}<h4>Calendário</h4><p>Meus dias de leitura.</p></a>
      <a class="menu-card" href="#/proximas-paginas">${icon('book')}<h4>Próximas páginas</h4><p>O que vem a seguir.</p></a>
    </div>

    <div class="ornament"><span>❧</span></div>

    <div class="year-picker">
      <label class="sr-only" for="yr">Ano</label>
      <select id="yr" data-year>${years.map(y => html`<option value="${y}" ${String(selYear) === String(y) ? raw('selected') : ''}>${y}</option>`)}<option value="all" ${selYear === 'all' ? raw('selected') : ''}>Todos os anos</option></select>
    </div>

    ${!books.length ? html`<div style="margin-top:20px">${emptyState('Sua trajetória começa no primeiro livro.', 'Os números e gráficos aparecem conforme você registra suas leituras.', html`<a class="btn btn-primary" href="#/livro/novo">${icon('plus')} Cadastrar livro</a>`)}</div>` : html`

    <section class="section" style="margin-top:18px">
      <div class="stat-grid">
        <div><b>${s.doneCount}</b><span>${year ? `lidos em ${year}` : 'livros concluídos'}</span></div>
        <div><b>${fmt(s.totalPages)}</b><span>páginas lidas</span></div>
        <div><b>${s.avgRating ? s.avgRating.toFixed(1).replace('.', ',') : '—'}</b><span>média de notas</span></div>
        <div><b>${s.avgPages ? fmt(s.avgPages) : '—'}</b><span>páginas por livro</span></div>
        <div><b>${books.length}</b><span>livros cadastrados</span></div>
        <div><b>${allDone}</b><span>concluídos no total</span></div>
      </div>
    </section>

    ${year ? html`<section class="section">
      <div class="section-head"><h2>Meta <em>anual</em></h2><span class="muted small">${s.doneCount} de ${goal}</span></div>
      <div class="card-flat">${progressBar(goalPct, 'thick')}<p class="small muted" style="margin-top:10px">${goalPct}% da meta${goalPct >= 100 ? ' — alcançada!' : ` · faltam ${plural(Math.max(0, goal - s.doneCount), 'livro', 'livros')}`}</p></div>
    </section>` : ''}

    <section class="section">
      <div class="section-head"><h2>Livros <em>por mês</em></h2></div>
      <div class="card-flat">${monthBars(s.byMonth)}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Páginas <em>por mês</em></h2></div>
      <div class="card-flat">${monthBars(s.pagesByMonth, { alt: true, unit: ' páginas' })}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Gêneros <em>mais lidos</em></h2></div>
      <div class="card-flat">${hbars(s.genres, { tone: feelingTone })}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Autores <em>mais lidos</em></h2></div>
      <div class="card-flat">${hbars(s.authors)}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Distribuição <em>de notas</em></h2></div>
      <div class="card-flat">${s.ratingDist.some(Boolean) ? ratingBars(s.ratingDist) : html`<p class="muted small">Dê notas aos livros concluídos para ver a distribuição.</p>`}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Destaques</h2></div>
      <div class="card-flat" style="padding:4px 16px">
        ${hl('Livro mais longo', s.longest, s.longest ? `${fmt(Number(s.longest.pages))} páginas` : '')}
        ${s.shortest && s.shortest !== s.longest ? hl('Livro mais curto', s.shortest, `${fmt(Number(s.shortest.pages))} páginas`) : ''}
        ${hl('Maior nota', s.favorite, s.favorite ? raw(String(stars(s.favorite.rating))) : '')}
        ${!s.longest && !s.favorite ? html`<p class="muted small" style="padding:12px 0">Os destaques aparecem quando houver livros concluídos${year ? ' neste ano' : ''}.</p>` : ''}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Favoritos <span class="muted small">${s.favorites.length}</span></h2><a href="#/estante?f=favoritos">ver</a></div>
      ${s.favorites.length ? html`<div class="cover-row">${s.favorites.map(b => html`<a href="#/livro/${b.id}">${cover(b, 'md')}</a>`)}</div>` : html`<p class="muted small">Marque livros como favoritos na página de cada um.</p>`}
    </section>
    <section class="section">
      <div class="grid-2">
        <a class="card-flat" href="#/estante?f=pausado" style="text-decoration:none"><b class="serif" style="font-size:30px;font-weight:500">${s.paused.length}</b><p class="small muted">${s.paused.length === 1 ? 'livro pausado' : 'livros pausados'}</p></a>
        <a class="card-flat" href="#/estante?f=abandonado" style="text-decoration:none"><b class="serif" style="font-size:30px;font-weight:500">${s.abandoned.length}</b><p class="small muted">${s.abandoned.length === 1 ? 'livro abandonado' : 'livros abandonados'}</p></a>
      </div>
    </section>`}
    <div class="ornament"><span>❧</span></div>
  `);

  root.onchange = e => { if (e.target.matches('[data-year]')) { selYear = e.target.value === 'all' ? 'all' : Number(e.target.value); refresh(); } };
}
