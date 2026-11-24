// Editor de escrita livre com salvamento automático (diário e resenhas)
import * as db from './db.js';
import { html, raw, icon, icons, fmtDate, debounce, esc, $ } from './utils.js';
import { savedIndicator, toast, confirmDialog, openSheet, stars, ratingInput, bindRatings } from './ui.js';
import { pickBook, pickFeeling, pickDate, editTags, pickPage } from './pickers.js';
import { feelingTone } from './model.js';

export async function mountWriter({ root, store, item, isNew, kind, go, back, after }) {
  const isReview = kind === 'review';
  let book = item.bookId ? await db.get('books', item.bookId) : null;
  let persisted = !isNew;
  let dirty = false;
  document.body.classList.add('writing');

  root.innerHTML = String(html`
    <div class="writer">
      <div class="writer-top">
        <button class="icon-btn" data-done aria-label="Voltar">${icon('back')}</button>
        <span class="status" data-status>${persisted ? 'salvo automaticamente' : ''}</span>
        ${isReview && persisted ? html`<a class="icon-btn" href="#/resenha/${item.id}" aria-label="Ver resenha" data-view>${icon('book')}</a>` : ''}
        <button class="icon-btn" data-more aria-label="Mais opções">${icon('more')}</button>
      </div>
      <div class="writer-meta" data-meta></div>
      ${isReview ? html`<input class="writer-title" data-title placeholder="Título (opcional)" value="${item.title || ''}" maxlength="200" aria-label="Título da resenha">` : ''}
      <textarea class="writer-body" data-body placeholder="${isReview ? 'Escreva livremente. O que este livro foi para você?' : 'O que esta leitura despertou em você agora?'}" aria-label="Texto">${item.text || ''}</textarea>
    </div>
    <div class="writer-foot"><span data-count></span><span>${isReview ? 'O que escrevi' : 'Entre pensamentos'}</span></div>
  `);
  const status = $('[data-status]', root);
  const body = $('[data-body]', root);
  const title = $('[data-title]', root);
  const top = $('.writer-top', root);

  const drawMeta = () => {
    const m = [];
    m.push(html`<button class="meta-btn ${book ? 'set' : ''}" data-m="book">${icon('book')}<span class="t">${book ? book.title : (item.bookTitle || (isReview ? 'Escolher livro' : 'Sem livro'))}</span></button>`);
    m.push(html`<button class="meta-btn set" data-m="date">${icon('calendar')}<span class="t">${fmtDate(item.date, 'long')}</span></button>`);
    if (!isReview) {
      m.push(html`<button class="meta-btn ${item.page ? 'set' : ''}" data-m="page">${icon('bookmark')}<span class="t">${item.page ? `pág. ${item.page}` : 'Página'}</span></button>`);
      m.push(html`<button class="meta-btn ${item.feeling ? 'set' : ''}" data-m="feeling" ${item.feeling ? raw(`style="--tone:${feelingTone(item.feeling)}"`) : ''}>${item.feeling ? html`<span class="feel" style="--tone:${feelingTone(item.feeling)};padding:0;background:none">${item.feeling}</span>` : html`${icon('leaf')}<span class="t">Sentimento</span>`}</button>`);
    } else {
      m.push(html`<button class="meta-btn ${item.rating ? 'set' : ''}" data-m="rating">${item.rating ? stars(item.rating) : html`${icon('star')}<span class="t">Nota</span>`}</button>`);
    }
    m.push(html`<button class="meta-btn ${item.tags?.length ? 'set' : ''}" data-m="tags">${icon('filter')}<span class="t">${item.tags?.length ? item.tags.map(t => '#' + t).join(' ') : 'Tags'}</span></button>`);
    $('[data-meta]', root).innerHTML = String(html`${m}`);
  };
  drawMeta();

  const count = () => {
    const w = (body.value.trim().match(/\S+/g) || []).length;
    $('[data-count]', root).textContent = w ? `${w} ${w === 1 ? 'palavra' : 'palavras'}` : '';
  };
  count();

  const isEmpty = () => !body.value.trim() && !(title && title.value.trim());
  const save = async () => {
    item.text = body.value;
    if (title) item.title = title.value.trim();
    if (!persisted && isEmpty()) { savedIndicator(status, ''); return; }
    savedIndicator(status, 'saving');
    try {
      await db.put(store, item);
      if (!persisted) { persisted = true; history.replaceState(null, '', `#/${isReview ? 'resenha' : 'pensamento'}/${item.id}${isReview ? '/editar' : ''}`); }
      dirty = false;
      savedIndicator(status, 'saved');
    } catch (e) { console.error(e); savedIndicator(status, 'error'); toast('Não foi possível salvar.', 'error'); }
  };
  const autosave = debounce(save, 700);
  const onInput = () => { dirty = true; savedIndicator(status, 'saving'); autosave(); count(); };
  body.addEventListener('input', onInput);
  title && title.addEventListener('input', onInput);
  if (isNew) setTimeout(() => (isReview && !item.bookId ? null : body.focus()), 350);

  const onScroll = () => top.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  const onHide = () => { if (dirty) autosave.flush(); };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);

  const setMeta = async (fn) => { await fn(); drawMeta(); if (persisted || !isEmpty()) { dirty = true; await save(); } };

  root.onclick = async e => {
    const mb = e.target.closest('[data-m]');
    if (mb) {
      const k = mb.dataset.m;
      if (k === 'book') {
        const id = await pickBook(item.bookId, { allowNone: true, title: isReview ? 'Resenha de qual livro?' : 'Sobre qual livro?' });
        if (id === undefined) return;
        await setMeta(async () => { item.bookId = id; book = id ? await db.get('books', id) : null; if (id) { item.bookTitle = ''; item.bookAuthor = ''; } if (isReview && book && !item.rating && book.rating) item.rating = book.rating; });
      }
      if (k === 'date') { const d = await pickDate(item.date); if (d) await setMeta(async () => { item.date = d; }); }
      if (k === 'page') { const p = await pickPage(item.page, book?.pages); if (p !== undefined) await setMeta(async () => { item.page = p ? Number(p) : ''; }); }
      if (k === 'feeling') { const f = await pickFeeling(item.feeling); if (f !== undefined) await setMeta(async () => { item.feeling = f; }); }
      if (k === 'tags') { const t = await editTags(item.tags || []); if (t) await setMeta(async () => { item.tags = t; }); }
      if (k === 'rating') {
        const { el, close } = openSheet(String(html`<div class="form">${ratingInput('r', item.rating)}${book ? html`<label class="switch"><span class="small">Usar também como nota do livro</span><input type="checkbox" data-sync checked></label>` : ''}<div class="row-btns"><button class="btn btn-primary" data-ok>Confirmar</button></div></div>`), { title: 'Nota', className: 'sheet-sm' });
        bindRatings(el);
        el.querySelector('[data-ok]').onclick = async () => {
          const v = Number(el.querySelector('input[name=r]').value) || 0;
          const sync = el.querySelector('[data-sync]')?.checked;
          close();
          await setMeta(async () => { item.rating = v; if (sync && book) { book.rating = v; await db.put('books', book); } });
        };
      }
      return;
    }
    if (e.target.closest('[data-done]')) { await finish(); return; }
    if (e.target.closest('[data-more]')) {
      const { el, close } = openSheet(`<div class="option-list">
        ${book ? `<a href="#/livro/${book.id}"><span class="ic">${icons.book}</span>Abrir o livro</a>` : ''}
        ${isReview && persisted ? `<a href="#/resenha/${item.id}"><span class="ic">${icons.diary}</span>Ver como leitura</a>` : ''}
        <button class="danger" data-del><span class="ic">${icons.trash}</span>Excluir ${isReview ? 'resenha' : 'registro'}</button></div>`, { title: isReview ? 'Resenha' : 'Registro' });
      el.querySelector('[data-del]').onclick = async () => {
        close();
        if (!(await confirmDialog({ title: isReview ? 'Excluir esta resenha?' : 'Excluir este registro?', message: 'O texto será apagado definitivamente.' }))) return;
        autosave.cancel(); dirty = false;
        if (persisted) await db.remove(store, item.id);
        persisted = false; body.value = ''; if (title) title.value = '';
        toast(isReview ? 'Resenha excluída' : 'Registro excluído');
        back();
      };
    }
  };

  async function finish() {
    autosave.cancel();
    if (dirty || (!persisted && !isEmpty())) await save();
    if (isReview && persisted && !isEmpty()) go(`#/resenha/${item.id}`, { replace: true });
    else back();
  }

  return async () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onHide);
    document.body.classList.remove('writing');
    if (dirty) { autosave.cancel(); await save(); }
    // registros que ficaram completamente vazios são descartados
    if (persisted && !(item.text || '').trim() && !(item.title || '').trim()) {
      await db.remove(store, item.id);
      toast('Registro vazio descartado');
    } else if (persisted && after) after(item);
  };
}
