import * as db from '../db.js';
import { html, raw, icon, MONTHS, MONTHS_SHORT, monthOf, excerpt, fmtDate, parseDate } from '../utils.js';
import { cover, stars, emptyState } from '../ui.js';
import { computeStats, yearsWithData, getGoal } from '../model.js';
import { monthBars } from '../charts.js';
import { quoteCard } from './quotes.js';
import { shareOrDownload } from '../share.js';

function goalChart(byMonth, goal) {
  const W = 340, H = 150, pb = 20, pt = 12;
  let acc = 0; const cum = byMonth.map(v => (acc += v));
  const max = Math.max(goal || 1, acc, 1);
  const x = i => 10 + i * ((W - 20) / 11);
  const y = v => H - pb - (v / max) * (H - pb - pt);
  const now = new Date();
  const pts = cum.map((v, i) => [x(i), y(v)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const gy = y(goal);
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução da meta">`;
  if (goal) out += `<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="var(--accent)" stroke-dasharray="4 4" opacity=".7"/><text x="${W}" y="${gy - 5}" text-anchor="end">meta ${goal}</text>`;
  out += `<path d="${path} L${x(11)},${H - pb} L${x(0)},${H - pb} Z" fill="var(--accent-2)" opacity=".12"/>`;
  out += `<path d="${path}" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => { out += `<text x="${p[0]}" y="${H - 4}" text-anchor="middle">${MONTHS_SHORT[i][0].toUpperCase()}</text>`; });
  const last = pts[11];
  out += `<circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="var(--accent-2)"/>`;
  return raw(`<div class="chart">${out}</svg></div>`);
}

export async function render({ root, params, go }) {
  const [books, reviews, entries, quotes] = await Promise.all(['books', 'reviews', 'entries', 'quotes'].map(s => db.all(s)));
  const years = yearsWithData(books, reviews, entries, quotes);
  const year = Number(params.year) || new Date().getFullYear();
  const s = computeStats(books, year, { reviews, quotes });
  const goal = await getGoal(year);
  const name = await db.getSetting('name', '');
  const bmap = new Map(books.map(b => [b.id, b]));
  const done = s.done.slice().sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));
  const yQuotes = s.quotes.slice().sort((a, b) => (b.favorite - a.favorite) || (b.date || '').localeCompare(a.date || '')).slice(0, 4);
  const yReviews = s.reviews.filter(r => (r.text || '').trim()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const yEntries = entries.filter(e => parseDate(e.date)?.getFullYear() === year).length;
  const fmt = n => n.toLocaleString('pt-BR');
  const bestMonth = s.byMonth.indexOf(Math.max(...s.byMonth));

  root.innerHTML = String(html`
    <header class="page-head with-back no-print">
      <button class="icon-btn" data-back aria-label="Voltar">${icon('back')}</button>
      <div class="page-head-text"><p class="kicker" style="margin:0">Retrospectiva</p></div>
      <div class="page-head-actions">
        <select data-year aria-label="Ano" style="border:0;background:transparent;font-family:var(--f-display);font-size:20px">${years.map(y => html`<option ${y === year ? raw('selected') : ''}>${y}</option>`)}</select>
        <button class="icon-btn" data-export aria-label="Exportar">${icon('share')}</button>
      </div>
    </header>

    ${!s.doneCount && !yQuotes.length && !yReviews.length ? emptyState(`${year} ainda está sendo escrito.`, 'Conclua livros, escreva resenhas e guarde fragmentos — sua retrospectiva vai nascer daí.', html`<a class="btn btn-soft" href="#/estante">Ir para a estante</a>`) : html`
    <article class="retro" id="retro">
      <section class="retro-cover">
        <p class="k">Nas Entrelinhas · Edição anual</p>
        <h1>${year}</h1>
        <h2>${name ? `O ano de leituras de ${name}` : 'Um ano entre histórias'}</h2>
        ${done.length ? html`<div class="covers-fan">${done.slice(-5).map((b, i, arr) => html`<span style="--rot:${(i - (arr.length - 1) / 2) * 6}deg;display:block">${cover(b, 'sm')}</span>`)}</div>` : ''}
      </section>

      <section class="retro-sec">
        <p class="k">Em números</p>
        <h3>O ano em que eu li…</h3>
        <div class="retro-numbers">
          <div><b>${s.doneCount}</b><span>${s.doneCount === 1 ? 'livro' : 'livros'}</span></div>
          <div><b>${fmt(s.totalPages)}</b><span>páginas</span></div>
          <div><b>${s.avgRating ? s.avgRating.toFixed(1).replace('.', ',') : '—'}</b><span>média de notas</span></div>
          <div><b>${yEntries + s.reviews.length + s.quotes.length}</b><span>registros escritos</span></div>
        </div>
      </section>

      ${s.favorite ? html`<section class="retro-sec retro-olive">
        <p class="k">Livro do ano</p>
        <div class="retro-fav">${cover(s.favorite, 'lg')}<div><h4>${s.favorite.title}</h4><p class="muted">${s.favorite.author}</p><div style="margin-top:10px">${stars(s.favorite.rating)}</div>
          ${s.favorite.memorableReason ? html`<p class="serif" style="font-style:italic;font-size:17px;margin-top:12px;line-height:1.4">“${s.favorite.memorableReason}”</p>` : ''}</div></div>
      </section>` : ''}

      ${s.doneCount ? html`<section class="retro-sec">
        <p class="k">Preferências</p>
        <h3>Para onde minhas leituras me levaram</h3>
        <div class="retro-pair">
          <div><p class="lbl">Gênero mais lido</p><p class="v">${s.genres[0]?.[0] || '—'}</p>${s.genres[0] ? html`<p class="small muted">${s.genres[0][1]} livros</p>` : ''}</div>
          <div><p class="lbl">Autor(a) mais lido(a)</p><p class="v">${s.authors[0]?.[0] || '—'}</p>${s.authors[0] ? html`<p class="small muted">${s.authors[0][1]} ${s.authors[0][1] === 1 ? 'livro' : 'livros'}</p>` : ''}</div>
          <div><p class="lbl">Mais longo</p><p class="v">${s.longest?.title || '—'}</p>${s.longest ? html`<p class="small muted">${fmt(Number(s.longest.pages))} páginas</p>` : ''}</div>
          <div><p class="lbl">Mais curto</p><p class="v">${s.shortest?.title || '—'}</p>${s.shortest ? html`<p class="small muted">${fmt(Number(s.shortest.pages))} páginas</p>` : ''}</div>
        </div>
      </section>

      <section class="retro-sec">
        <p class="k">Ritmo</p>
        <h3>Livros por mês</h3>
        ${monthBars(s.byMonth)}
        ${s.byMonth[bestMonth] ? html`<p class="small muted" style="margin-top:10px">Meu mês mais intenso foi <b>${MONTHS[bestMonth]}</b>, com ${s.byMonth[bestMonth]} ${s.byMonth[bestMonth] === 1 ? 'livro' : 'livros'}.</p>` : ''}
      </section>

      <section class="retro-sec">
        <p class="k">Meta</p>
        <h3>${s.doneCount >= goal ? 'Meta alcançada' : `${Math.round(s.doneCount / goal * 100)}% da meta`}</h3>
        ${goalChart(s.byMonth, goal)}
        <p class="small muted" style="margin-top:10px">${s.doneCount} de ${goal} livros planejados para ${year}.</p>
      </section>` : ''}

      ${s.memorable.length ? html`<section class="retro-sec retro-olive">
        <p class="k">Livros que ficaram</p>
        <h3>O que permaneceu comigo</h3>
        <div class="cover-row">${s.memorable.map(b => html`<a href="#/livro/${b.id}">${cover(b, 'md')}<div class="meta"><b>${b.title}</b></div></a>`)}</div>
      </section>` : ''}

      ${yQuotes.length ? html`<section class="retro-sec">
        <p class="k">Fragmentos</p>
        <h3>Frases que guardei</h3>
        <div class="quote-list">${yQuotes.map(q => quoteCard(q, bmap.get(q.bookId)))}</div>
      </section>` : ''}

      ${yReviews.length ? html`<section class="retro-sec">
        <p class="k">O que escrevi</p>
        <h3>${yReviews.length === 1 ? 'Uma resenha' : `${yReviews.length} resenhas`}</h3>
        <div class="review-grid">${yReviews.slice(0, 6).map(r => { const b = bmap.get(r.bookId); return html`<a class="card-flat" style="text-decoration:none" href="#/resenha/${r.id}"><p class="small muted">${fmtDate(r.date, 'long')}</p><h4 class="serif" style="font-size:20px;font-weight:600">${r.title || b?.title || 'Resenha'}</h4><p class="prose small" style="margin-top:6px;color:var(--text-2)">${excerpt(r.text, 170)}</p></a>`; })}</div>
      </section>` : ''}

      ${done.length ? html`<section class="retro-sec">
        <p class="k">Linha do tempo</p>
        <h3>Livro a livro</h3>
        <ol class="retro-tl">${done.map(b => html`<li><span class="m">${b.endDate ? MONTHS_SHORT[monthOf(b.endDate)] : '—'}</span>${cover(b, 'xs')}<div><h5>${b.title}</h5><p>${b.author}${b.rating ? ` · ${String(b.rating).replace('.', ',')} ★` : ''}</p></div></li>`)}</ol>
      </section>` : ''}

      <p class="retro-end">Entre histórias, pensamentos<br>e tudo aquilo que permanece.</p>
    </article>`}
  `);

  root.onchange = e => { if (e.target.matches('[data-year]')) go(`#/retrospectiva/${e.target.value}`, { replace: true }); };
  root.onclick = async e => {
    if (!e.target.closest('[data-export]')) return;
    const { openSheet } = await import('../ui.js');
    const { el, close } = openSheet(`<div class="option-list">
      <button data-img><span class="ic">${(await import('../utils.js')).icons.image}</span><span style="flex:1">Salvar como imagem<br><small class="muted">Um cartão-resumo do seu ano</small></span></button>
      <button data-pdf><span class="ic">${(await import('../utils.js')).icons.print}</span><span style="flex:1">Exportar em PDF<br><small class="muted">Use “Salvar como PDF” na janela de impressão</small></span></button></div>`, { title: 'Exportar retrospectiva' });
    el.querySelector('[data-pdf]').onclick = () => { close(); setTimeout(() => window.print(), 350); };
    el.querySelector('[data-img]').onclick = async () => {
      close();
      const c = await summaryImage({ year, name, s, goal, done });
      await shareOrDownload(c, `retrospectiva-${year}.png`, `Retrospectiva ${year}`);
    };
  };
}

async function loadImg(src) {
  return new Promise(res => { if (!src) return res(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

async function summaryImage({ year, name, s, goal, done }) {
  try { await Promise.all([document.fonts.load('400 100px "Cormorant Garamond"'), document.fonts.load('italic 400 40px "Cormorant Garamond"'), document.fonts.load('400 28px "DM Sans"')]); } catch (e) { /* ok */ }
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#45372E'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(245,240,232,.25)'; x.lineWidth = 2; x.strokeRect(50, 50, W - 100, H - 100);
  x.textAlign = 'center'; x.fillStyle = '#D8C6B2';
  x.font = '400 26px "DM Sans", sans-serif'; x.letterSpacing = '8px'; x.fillText('NAS ENTRELINHAS · RETROSPECTIVA', W / 2, 170); x.letterSpacing = '0px';
  x.fillStyle = '#F5F0E8'; x.font = '400 260px "Cormorant Garamond", Georgia, serif'; x.fillText(String(year), W / 2, 430);
  x.fillStyle = '#D8C6B2'; x.font = 'italic 400 52px "Cormorant Garamond", Georgia, serif';
  x.fillText(name ? `O ano de leituras de ${name}` : 'Um ano entre histórias', W / 2, 520);
  // capas
  const covers = done.filter(b => b.cover).slice(-5);
  const imgs = await Promise.all(covers.map(b => loadImg(b.cover)));
  const valid = imgs.filter(Boolean);
  if (valid.length) {
    const cw = 170, ch = 255, gap = -20, total = valid.length * cw + (valid.length - 1) * gap;
    valid.forEach((im, i) => {
      x.save(); const cx = (W - total) / 2 + i * (cw + gap) + cw / 2, cy = 760;
      x.translate(cx, cy); x.rotate(((i - (valid.length - 1) / 2) * 6) * Math.PI / 180);
      x.fillStyle = '#45372E'; x.fillRect(-cw / 2 - 4, -ch / 2 - 4, cw + 8, ch + 8);
      try { x.drawImage(im, -cw / 2, -ch / 2, cw, ch); } catch (e) { /* ignora */ }
      x.restore();
    });
  }
  const nums = [[s.doneCount, s.doneCount === 1 ? 'livro' : 'livros'], [s.totalPages.toLocaleString('pt-BR'), 'páginas'], [s.avgRating ? s.avgRating.toFixed(1).replace('.', ',') : '—', 'média de notas'], [`${Math.min(100, Math.round(s.doneCount / (goal || 1) * 100))}%`, 'da meta']];
  nums.forEach(([n, l], i) => {
    const cx = i % 2 ? W * 0.72 : W * 0.28, cy = 1050 + Math.floor(i / 2) * 230;
    x.fillStyle = '#F5F0E8'; x.font = '400 120px "Cormorant Garamond", Georgia, serif'; x.fillText(String(n), cx, cy);
    x.fillStyle = '#B98B78'; x.font = '400 28px "DM Sans", sans-serif'; x.letterSpacing = '4px'; x.fillText(l.toUpperCase(), cx, cy + 50); x.letterSpacing = '0px';
  });
  let y = 1560;
  const line = (k, v) => { if (!v) return; x.fillStyle = '#B98B78'; x.font = '400 24px "DM Sans", sans-serif'; x.letterSpacing = '4px'; x.fillText(k.toUpperCase(), W / 2, y); x.letterSpacing = '0px'; x.fillStyle = '#F5F0E8'; x.font = 'italic 400 46px "Cormorant Garamond", Georgia, serif'; x.fillText(v.length > 40 ? v.slice(0, 38) + '…' : v, W / 2, y + 56); y += 140; };
  line('Livro do ano', s.favorite?.title);
  line('Gênero mais lido', s.genres[0]?.[0]);
  x.fillStyle = '#D8C6B2'; x.font = 'italic 400 34px "Cormorant Garamond", Georgia, serif'; x.fillText('Entre histórias, pensamentos e tudo aquilo que permanece.', W / 2, H - 100);
  return c;
}
