// Folhas de seleção reutilizadas pelos editores
import * as db from './db.js';
import { html, esc, icon, icons, matches, todayISO, parseTags } from './utils.js';
import { openSheet, cover, toast } from './ui.js';
import { getFeelings, feelingTone, STATUS } from './model.js';

export function pickBook(currentId = null, { allowNone = true, title = 'Qual livro?' } = {}) {
  return new Promise(async resolve => {
    const books = (await db.all('books')).slice().sort((a, b) => {
      const order = { lendo: 0, pausado: 1, concluido: 2, 'quero-ler': 3, abandonado: 4 };
      return (order[a.status] - order[b.status]) || (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    let done = false;
    const { el, close } = openSheet(`
      <div class="searchbar" style="margin-bottom:8px"><span class="ic">${icons.search}</span><input type="search" placeholder="Buscar na estante" aria-label="Buscar livro"></div>
      <div class="option-list" data-list></div>`, { title, onClose: () => { if (!done) resolve(undefined); } });
    const list = el.querySelector('[data-list]');
    const draw = q => {
      const items = books.filter(b => matches(q, b.title, b.author));
      list.innerHTML = String(html`
        ${allowNone ? html`<button data-id=""><span class="ic">${icon('feather')}</span><span style="flex:1">Sem livro — registro independente</span>${!currentId ? icon('check', 'check') : ''}</button>` : ''}
        ${items.map(b => html`<button data-id="${b.id}" class="${b.id === currentId ? 'sel' : ''}">${cover(b, 'xs')}<span style="flex:1;min-width:0"><b style="font-weight:500;display:block">${b.title}</b><small class="muted">${b.author || ''} · ${STATUS[b.status]?.label || ''}</small></span>${b.id === currentId ? icon('check', 'check') : ''}</button>`)}
        ${!items.length ? html`<p class="muted small center" style="padding:16px">Nenhum livro encontrado.</p>` : ''}`);
    };
    draw('');
    el.querySelector('input').addEventListener('input', e => draw(e.target.value));
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      done = true; resolve(b.dataset.id || null); close();
    });
  });
}

export function pickFeeling(current = '') {
  return new Promise(async resolve => {
    const feelings = await getFeelings();
    let done = false;
    const { el, close } = openSheet(`
      <p class="muted small" style="margin-bottom:12px">Como esta leitura te fez sentir agora?</p>
      <div class="pick-chips" data-list>
        ${feelings.map(f => `<label style="--tone:${feelingTone(f)}"><input type="radio" name="f" value="${esc(f)}" ${f === current ? 'checked' : ''}><span>${esc(f)}</span></label>`).join('')}
      </div>
      <form class="toolbar" style="margin-top:16px" data-new><input class="input" placeholder="Outro sentimento…" aria-label="Novo sentimento" maxlength="30"><button class="btn btn-soft btn-sm">Criar</button></form>
      <div class="row-btns"><button class="btn btn-ghost" data-clear>Sem sentimento</button></div>`, { title: 'Sentimento', onClose: () => { if (!done) resolve(undefined); } });
    el.querySelector('[data-list]').addEventListener('change', e => { done = true; resolve(e.target.value); close(); });
    el.querySelector('[data-clear]').onclick = () => { done = true; resolve(''); close(); };
    el.querySelector('[data-new]').onsubmit = async e => {
      e.preventDefault();
      const v = e.target.querySelector('input').value.trim();
      if (!v) return;
      await addCustomFeeling(v);
      done = true; resolve(v); close();
    };
  });
}

export async function addCustomFeeling(name) {
  const n = name.trim().replace(/^\w/, c => c.toUpperCase());
  const custom = await db.getSetting('customFeelings', []);
  if (!custom.includes(n) && !(await getFeelings()).includes(n)) { custom.push(n); await db.setSetting('customFeelings', custom); toast(`Sentimento “${n}” criado`); }
  return n;
}

export function pickDate(current = todayISO(), title = 'Data') {
  return new Promise(resolve => {
    let done = false;
    const { el, close } = openSheet(`<form class="form"><label class="field"><span>Data</span><input type="date" name="d" value="${esc(current || todayISO())}" max="2100-12-31"></label>
      <div class="row-btns"><button class="btn btn-primary">Confirmar</button></div></form>`, { title, className: 'sheet-sm', onClose: () => { if (!done) resolve(undefined); } });
    el.querySelector('form').onsubmit = e => { e.preventDefault(); const v = e.target.d.value; if (!v) return; done = true; resolve(v); close(); };
  });
}

export function editTags(current = []) {
  return new Promise(resolve => {
    let done = false;
    const { el, close } = openSheet(`<form class="form"><label class="field"><span>Tags</span><input name="t" value="${esc(current.join(', '))}" placeholder="ex.: memória, família, releitura"></label><p class="hint">Separe por vírgulas.</p>
      <div class="row-btns"><button class="btn btn-primary">Confirmar</button></div></form>`, { title: 'Tags', className: 'sheet-sm', onClose: () => { if (!done) resolve(undefined); } });
    setTimeout(() => el.querySelector('input').focus(), 250);
    el.querySelector('form').onsubmit = e => { e.preventDefault(); done = true; resolve(parseTags(e.target.t.value)); close(); };
  });
}

export function pickPage(current = '', max) {
  return new Promise(resolve => {
    let done = false;
    const { el, close } = openSheet(`<form class="form"><label class="field"><span>Página</span><input name="p" type="number" inputmode="numeric" min="0" ${max ? `max="${max}"` : ''} value="${esc(current)}" placeholder="opcional"></label>
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-clear>Sem página</button><button class="btn btn-primary">Confirmar</button></div></form>`, { title: 'Página', className: 'sheet-sm', onClose: () => { if (!done) resolve(undefined); } });
    setTimeout(() => el.querySelector('input').focus(), 250);
    el.querySelector('[data-clear]').onclick = () => { done = true; resolve(''); close(); };
    el.querySelector('form').onsubmit = e => { e.preventDefault(); done = true; resolve(e.target.p.value); close(); };
  });
}
