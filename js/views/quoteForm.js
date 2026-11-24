import * as db from '../db.js';
import { html, raw, icon, icons, uid, todayISO, parseTags, esc, $ } from '../utils.js';
import { pageHeader, toast, confirmDialog, openSheet, emptyState } from '../ui.js';
import { CARD_STYLES, quoteImage, shareOrDownload } from '../share.js';
import { quoteCard } from './quotes.js';

export async function render({ root, params, query, go, back }) {
  const editing = !!params.id;
  let q = editing ? await db.get('quotes', params.id) : null;
  if (editing && !q) { root.innerHTML = String(emptyState('Este fragmento não existe mais.', '', html`<a class="btn btn-soft" href="#/fragmentos">Ver fragmentos</a>`)); return; }
  const books = (await db.all('books')).slice().sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  const pre = query.book ? books.find(b => b.id === query.book) : null;
  q = q ? structuredClone(q) : { id: uid(), text: '', bookId: pre?.id || null, author: '', page: pre?.status === 'lendo' && pre.currentPage ? pre.currentPage : '', date: todayISO(), comment: '', tags: [], favorite: false, style: 'creme' };
  const sel = (a, b) => (String(a ?? '') === String(b ?? '') ? raw('selected') : '');

  root.innerHTML = String(html`
    ${pageHeader({ title: editing ? 'Fragmento' : 'Guardar fragmento', back: true, actions: editing ? html`<button class="icon-btn" data-share aria-label="Compartilhar como imagem">${icon('share')}</button><button class="icon-btn" data-del aria-label="Excluir">${icon('trash')}</button>` : '' })}
    <div data-preview style="margin-bottom:24px"></div>
    <form class="form" novalidate>
      <label class="field" data-f="text"><span>Trecho <b class="req">*</b></span><textarea name="text" rows="5" placeholder="Copie aqui a frase que te marcou…" style="font-family:var(--f-display);font-size:20px;line-height:1.4">${q.text}</textarea></label>
      <label class="field"><span>Livro</span><select name="bookId">
        <option value="">— não está na estante —</option>
        ${books.map(b => html`<option value="${b.id}" ${sel(q.bookId, b.id)}>${b.title}${b.author ? ` — ${b.author}` : ''}</option>`)}
      </select></label>
      <label class="field" data-free ${q.bookId ? raw('hidden') : ''}><span>Título da obra</span><input name="bookTitle" value="${q.bookTitle || ''}" placeholder="opcional"></label>
      <div class="grid-2">
        <label class="field"><span>Autor(a)</span><input name="author" value="${q.author || ''}" placeholder="${books.find(b => b.id === q.bookId)?.author || ''}"></label>
        <label class="field"><span>Página</span><input name="page" type="number" inputmode="numeric" min="0" value="${q.page || ''}"></label>
      </div>
      <label class="field"><span>Data</span><input name="date" type="date" value="${q.date || todayISO()}"></label>
      <label class="field"><span>Comentário pessoal</span><textarea name="comment" rows="3" placeholder="Por que esse trecho ficou com você?">${q.comment || ''}</textarea></label>
      <label class="field"><span>Tags</span><input name="tags" value="${(q.tags || []).join(', ')}" placeholder="ex.: amor, tempo, coragem"></label>
      <div class="field"><span class="field-label">Estilo do cartão</span>
        <div class="style-picker">${Object.entries(CARD_STYLES).map(([k, s]) => html`<label title="${s.label}"><input type="radio" name="style" value="${k}" ${q.style === k ? raw('checked') : ''}><span style="background:${s.bg}"></span></label>`)}</div>
      </div>
      <label class="switch"><span>Favorito</span><input type="checkbox" name="favorite" ${q.favorite ? raw('checked') : ''}></label>
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-back>Cancelar</button><button class="btn btn-primary">${editing ? 'Salvar' : 'Guardar fragmento'}</button></div>
    </form>
  `);
  const f = $('form', root);

  const collect = () => {
    const b = books.find(x => x.id === f.bookId.value);
    return {
      ...q, text: f.text.value.trim(), bookId: f.bookId.value || null, bookTitle: f.bookId.value ? '' : f.bookTitle.value.trim(),
      author: f.author.value.trim(), page: f.page.value ? Number(f.page.value) : '', date: f.date.value || todayISO(),
      comment: f.comment.value.trim(), tags: parseTags(f.tags.value), favorite: f.favorite.checked, style: f.style.value || 'creme',
      _book: b,
    };
  };
  const preview = () => {
    const c = collect();
    $('[data-preview]', root).innerHTML = c.text ? String(quoteCard(c, c._book)).replace(/^<a /, '<div ').replace(/<\/a>$/, '</div>') : '';
  };
  preview();
  f.addEventListener('input', preview);
  f.addEventListener('change', () => {
    $('[data-free]', root).hidden = !!f.bookId.value;
    f.author.placeholder = books.find(b => b.id === f.bookId.value)?.author || '';
    preview();
  });

  f.onsubmit = async e => {
    e.preventDefault();
    const c = collect();
    const fld = $('[data-f="text"]', root);
    fld.classList.remove('invalid'); fld.querySelector('.err')?.remove();
    if (!c.text) { fld.classList.add('invalid'); fld.insertAdjacentHTML('beforeend', '<small class="err">Escreva o trecho que deseja guardar.</small>'); toast('O trecho não pode ficar vazio.', 'error'); return; }
    delete c._book;
    await db.put('quotes', c);
    toast(editing ? 'Fragmento atualizado' : 'Fragmento guardado');
    back();
  };

  root.onclick = async e => {
    if (e.target.closest('[data-del]')) {
      if (!(await confirmDialog({ title: 'Excluir este fragmento?', message: 'O trecho e seu comentário serão apagados.' }))) return;
      await db.remove('quotes', q.id); toast('Fragmento excluído'); go('#/fragmentos', { replace: true });
    }
    if (e.target.closest('[data-share]')) {
      const c = collect();
      if (!c.text) return;
      openShare({ text: c.text, author: c.author || c._book?.author || q.bookAuthor || '', book: c._book?.title || c.bookTitle || '', page: c.page }, c.style);
    }
  };
}

export function openShare(data, initialStyle = 'creme') {
  let style = initialStyle, format = 'square', canvas = null;
  const { el } = openSheet(String(html`
    <img class="share-preview" data-img alt="Prévia do cartão">
    <div class="field" style="margin-top:16px"><span class="field-label">Estilo</span>
      <div class="style-picker">${Object.entries(CARD_STYLES).map(([k, s]) => html`<label title="${s.label}"><input type="radio" name="st" value="${k}" ${k === style ? raw('checked') : ''}><span style="background:${s.bg}"></span></label>`)}</div></div>
    <div class="seg" style="margin-top:14px"><button class="active" data-fmt="square">Post 4:5</button><button data-fmt="story">Story 9:16</button></div>
    <div class="row-btns"><button class="btn btn-primary" data-go>${icon('share')} Compartilhar ou salvar</button></div>`), { title: 'Cartão do fragmento' });
  const img = el.querySelector('[data-img]');
  const draw = async () => { canvas = await quoteImage(data, style, format); img.src = canvas.toDataURL('image/png'); };
  draw();
  el.addEventListener('change', e => { if (e.target.name === 'st') { style = e.target.value; draw(); } });
  el.addEventListener('click', async e => {
    const fm = e.target.closest('[data-fmt]');
    if (fm) { format = fm.dataset.fmt; el.querySelectorAll('[data-fmt]').forEach(b => b.classList.toggle('active', b === fm)); draw(); }
    if (e.target.closest('[data-go]') && canvas) await shareOrDownload(canvas, `fragmento-${Date.now()}.png`);
  });
}
