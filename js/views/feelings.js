import * as db from '../db.js';
import { html, raw, icon, esc } from '../utils.js';
import { cover, stars, pageHeader, emptyState, toast, confirmDialog, promptDialog } from '../ui.js';
import { getFeelings, feelingTone, DEFAULT_FEELINGS } from '../model.js';
import { addCustomFeeling } from '../pickers.js';

let active = '';

export async function render({ root, refresh }) {
  const [books, entries] = await Promise.all([db.all('books'), db.all('entries')]);
  const feelings = await getFeelings();
  const custom = await db.getSetting('customFeelings', []);
  const count = f => books.filter(b => (b.feelings || []).includes(f)).length;
  const entryCount = f => entries.filter(e => e.feeling === f).length;
  const used = feelings.map(f => [f, count(f), entryCount(f)]).filter(([, n, m]) => n || m).sort((a, b) => (b[1] + b[2]) - (a[1] + a[2]));
  const max = Math.max(1, ...used.map(([, n, m]) => n + m));
  if (active && !used.some(([f]) => f === active)) active = '';
  const list = active ? books.filter(b => (b.feelings || []).includes(active)) : [];
  const relEntries = active ? entries.filter(e => e.feeling === active && (e.text || '').trim()) : [];
  const bmap = new Map(books.map(b => [b.id, b]));

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Mapa emocional', kicker: 'O que os livros me fizeram sentir', back: true })}
    ${used.length ? html`
      <p class="mem-intro">Toque em um sentimento para ver as leituras que o despertaram.</p>
      <div class="card-flat emotion-cloud">
        ${used.map(([f, n, m]) => html`<button class="emotion-bubble ${active === f ? 'active' : ''}" data-f="${f}" style="--tone:${feelingTone(f)};--w:${((n + m) / max).toFixed(2)}">${f}<small>${n + m}</small></button>`)}
      </div>
      ${active ? html`
        <section class="section">
          <div class="section-head"><h2><em>${active}</em></h2><span class="muted small">${list.length} ${list.length === 1 ? 'livro' : 'livros'}</span></div>
          ${list.length ? html`<div class="shelf-list">${list.map(b => html`<a class="book-row" href="#/livro/${b.id}">${cover(b, 'sm')}<div class="info"><h4>${b.title}</h4><p class="author">${b.author}</p><div class="line">${b.rating ? stars(b.rating) : ''}${(b.feelings || []).filter(x => x !== active).slice(0, 3).map(x => html`<span class="feel" style="--tone:${feelingTone(x)}">${x}</span>`)}</div></div></a>`)}</div>` : html`<p class="muted small">Nenhum livro marcado com este sentimento — apenas registros do diário.</p>`}
          ${relEntries.length ? html`<p class="field-label" style="margin:22px 0 10px">No diário</p>${relEntries.slice(0, 5).map(e => html`<a class="card-flat" href="#/pensamento/${e.id}" style="display:block;text-decoration:none;margin-bottom:10px"><p class="small muted">${bmap.get(e.bookId)?.title || 'Registro livre'}</p><p class="prose" style="margin-top:4px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${e.text}</p></a>`)}` : ''}
        </section>` : ''}
    ` : emptyState('Seu mapa ainda está em branco.', 'Associe sentimentos aos livros (na edição de cada livro) ou aos registros do diário, e eles aparecerão aqui.', html`<a class="btn btn-soft" href="#/estante">Ir para a estante</a>`)}

    <section class="section">
      <div class="section-head"><h2>Meus <em>sentimentos</em></h2><button data-add>+ criar</button></div>
      <div class="tags">${feelings.map(f => html`<span class="feel" style="--tone:${feelingTone(f)}">${f}${!DEFAULT_FEELINGS.includes(f) ? html` <button data-rm="${f}" aria-label="Remover ${f}" style="border:0;background:none;padding:0 0 0 2px;color:var(--muted)">×</button>` : ''}</span>`)}</div>
      <p class="hint" style="margin-top:10px">Os sentimentos sugeridos são fixos; os que você cria podem ser removidos.</p>
    </section>
  `);

  root.onclick = async e => {
    const b = e.target.closest('[data-f]');
    if (b) { active = active === b.dataset.f ? '' : b.dataset.f; refresh(); return; }
    if (e.target.closest('[data-add]')) {
      const v = await promptDialog({ title: 'Novo sentimento', label: 'Nome', placeholder: 'ex.: Ternura' });
      if (v && v.trim()) { await addCustomFeeling(v); refresh(); }
      return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const f = rm.dataset.rm;
      if (!(await confirmDialog({ title: `Remover “${f}”?`, message: 'Livros e registros que usam este sentimento continuarão com ele, mas ele deixará de aparecer nas sugestões.', confirm: 'Remover' }))) return;
      await db.setSetting('customFeelings', custom.filter(x => x !== f));
      toast('Sentimento removido'); refresh();
    }
  };
}
