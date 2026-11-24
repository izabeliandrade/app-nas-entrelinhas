import * as db from '../db.js';
import { html, raw, icon, MONTHS, toISODate, todayISO, excerpt, fmtDate, pad } from '../utils.js';
import { cover, openSheet } from '../ui.js';

const st = { y: new Date().getFullYear(), m: new Date().getMonth(), sel: todayISO() };

export async function render({ root, refresh }) {
  const [books, entries, quotes, reviews] = await Promise.all(['books', 'entries', 'quotes', 'reviews'].map(s => db.all(s)));
  const bmap = new Map(books.map(b => [b.id, b]));
  const ev = new Map();
  const add = (d, item) => { if (!d) return; d = d.slice(0, 10); if (!ev.has(d)) ev.set(d, []); ev.get(d).push(item); };
  books.forEach(b => {
    if (b.startDate && b.status !== 'quero-ler') add(b.startDate, { kind: 'start', label: 'Início de leitura', text: b.title, book: b, href: `#/livro/${b.id}` });
    if (b.endDate && b.status === 'concluido') add(b.endDate, { kind: 'end', label: 'Leitura concluída', text: b.title, book: b, href: `#/livro/${b.id}` });
  });
  entries.filter(e => (e.text || '').trim()).forEach(e => add(e.date, { kind: 'entry', label: 'Pensamento', text: excerpt(e.text, 90), book: bmap.get(e.bookId), href: `#/pensamento/${e.id}` }));
  quotes.forEach(q => add(q.date, { kind: 'quote', label: 'Fragmento', text: '“' + excerpt(q.text, 90) + '”', book: bmap.get(q.bookId), href: `#/fragmento/${q.id}` }));
  reviews.filter(r => (r.text || '').trim()).forEach(r => add(r.date, { kind: 'review', label: 'Resenha', text: r.title || bmap.get(r.bookId)?.title || excerpt(r.text, 60), book: bmap.get(r.bookId), href: `#/resenha/${r.id}` }));

  const first = new Date(st.y, st.m, 1);
  const startOffset = first.getDay();
  const days = [];
  for (let i = 0; i < 42; i++) days.push(new Date(st.y, st.m, 1 - startOffset + i));
  while (days.length > 35 && days[days.length - 7].getMonth() !== st.m) days.splice(-7);
  const today = todayISO();
  const monthCount = [...ev.entries()].filter(([d]) => d.startsWith(`${st.y}-${pad(st.m + 1)}`)).reduce((s, [, l]) => s + l.length, 0);
  const selItems = ev.get(st.sel) || [];

  root.innerHTML = String(html`
    <header class="page-head with-back"><button class="icon-btn" data-back aria-label="Voltar">${icon('back')}</button><div class="page-head-text"><p class="kicker" style="margin:0">Calendário literário</p></div>
      <div class="page-head-actions"><button class="btn btn-ghost btn-sm" data-today>Hoje</button></div></header>
    <div class="cal-head">
      <button class="icon-btn bordered" data-nav="-1" aria-label="Mês anterior">${icon('chevronL')}</button>
      <button data-pick style="border:0;background:none;text-align:center"><h2>${MONTHS[st.m]} <small>${st.y}</small></h2><p class="small muted">${monthCount ? `${monthCount} ${monthCount === 1 ? 'registro' : 'registros'}` : 'nenhum registro'}</p></button>
      <button class="icon-btn bordered" data-nav="1" aria-label="Próximo mês">${icon('chevronR')}</button>
    </div>
    <div class="cal-grid">
      ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => html`<span class="wd">${d}</span>`)}
      ${days.map(d => {
        const iso = toISODate(d); const items = ev.get(iso) || [];
        const kinds = [...new Set(items.map(i => i.kind))];
        return html`<button class="cal-day ${d.getMonth() !== st.m ? 'out' : ''} ${iso === today ? 'today' : ''} ${iso === st.sel ? 'sel' : ''} ${items.length ? 'has' : ''}" data-day="${iso}" aria-label="${fmtDate(iso, 'long')}${items.length ? `, ${items.length} registros` : ''}">
          <span>${d.getDate()}</span><span class="cal-dots">${kinds.slice(0, 4).map(k => html`<i class="dot-${k}"></i>`)}</span></button>`;
      })}
    </div>
    <div class="cal-legend"><span><i class="dot-start"></i>início</span><span><i class="dot-end"></i>conclusão</span><span><i class="dot-entry"></i>pensamento</span><span><i class="dot-quote"></i>fragmento</span><span><i class="dot-review"></i>resenha</span></div>

    <section class="day-list">
      <div class="section-head"><h2>${fmtDate(st.sel, 'long')}</h2></div>
      ${selItems.length ? selItems.map(i => html`<a class="day-item" href="${i.href}">${i.book ? cover(i.book, 'xs') : html`<span class="cal-dots"><i class="dot-${i.kind}" style="width:9px;height:9px"></i></span>`}<div style="flex:1;min-width:0"><p class="kind">${i.label}${i.book && i.kind !== 'start' && i.kind !== 'end' ? ` · ${i.book.title}` : ''}</p><p class="txt">${i.text}</p></div>${icon('chevronR')}</a>`)
        : html`<p class="muted small" style="padding:6px 0 14px">Nenhum registro neste dia.</p>`}
      <div class="row-btns" style="justify-content:flex-start"><a class="btn btn-soft btn-sm" href="#/pensamento/novo?date=${st.sel}">${icon('feather')} Escrever neste dia</a></div>
    </section>
  `);

  root.onclick = async e => {
    const n = e.target.closest('[data-nav]');
    if (n) { const d = new Date(st.y, st.m + Number(n.dataset.nav), 1); st.y = d.getFullYear(); st.m = d.getMonth(); refresh(); return; }
    const d = e.target.closest('[data-day]');
    if (d) { st.sel = d.dataset.day; const dt = new Date(st.sel + 'T12:00'); if (dt.getMonth() !== st.m) { st.y = dt.getFullYear(); st.m = dt.getMonth(); } refresh(); return; }
    if (e.target.closest('[data-today]')) { const t = new Date(); st.y = t.getFullYear(); st.m = t.getMonth(); st.sel = todayISO(); refresh(); return; }
    if (e.target.closest('[data-pick]')) {
      const { el, close } = openSheet(String(html`<form class="form"><div class="grid-2">
        <label class="field"><span>Mês</span><select name="m">${MONTHS.map((m, i) => html`<option value="${i}" ${i === st.m ? raw('selected') : ''}>${m}</option>`)}</select></label>
        <label class="field"><span>Ano</span><input name="y" type="number" inputmode="numeric" min="1900" max="2100" value="${st.y}"></label></div>
        <div class="row-btns"><button class="btn btn-primary">Ir</button></div></form>`), { title: 'Ir para', className: 'sheet-sm' });
      el.querySelector('form').onsubmit = ev2 => { ev2.preventDefault(); const y = Number(ev2.target.y.value); if (y < 1900 || y > 2100) return; st.y = y; st.m = Number(ev2.target.m.value); close(); refresh(); };
    }
  };
}
