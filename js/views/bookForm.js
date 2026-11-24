import * as db from '../db.js';
import { html, raw, icon, icons, esc, uid, todayISO, parseTags, readFileAsDataURL, resizeImage, $ } from '../utils.js';
import { cover, pageHeader, ratingInput, bindRatings, toast, openSheet, confirmDialog } from '../ui.js';
import { STATUS, FORMATS, GENRES, PRIORITY, getFeelings, feelingTone } from '../model.js';
import { searchBooks, findCover, localizeCover, langName } from '../search.js';
import { addCustomFeeling } from '../pickers.js';

const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');

export async function render({ root, params, query, go, back }) {
  const editing = !!params.id;
  let book = editing ? await db.get('books', params.id) : null;
  if (editing && !book) { root.innerHTML = '<div class="empty"><p class="empty-title serif">Livro não encontrado.</p><a class="btn btn-soft" href="#/estante">Ir para a estante</a></div>'; return; }
  book = book ? structuredClone(book) : {
    id: uid(), title: '', author: '', status: query.status || 'quero-ler', format: 'fisico', tags: [], feelings: [],
    language: 'Português', priority: 'media', addedAt: todayISO(),
  };
  const feelings = await getFeelings();
  const genres = [...new Set([...GENRES, ...(await db.all('books')).map(b => b.genre).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt'));
  let coverValue = book.cover || '';

  root.innerHTML = String(html`
    ${pageHeader({ title: editing ? 'Editar livro' : 'Novo livro', back: true })}
    ${!editing ? html`<button type="button" class="card-flat" data-search style="width:100%;display:flex;gap:12px;align-items:center;text-align:left;margin-bottom:22px;cursor:pointer">
        <span class="ic" style="color:var(--accent)">${raw(icons.search)}</span>
        <span style="flex:1"><b style="font-weight:500">Buscar e preencher automaticamente</b><br><small class="muted">Pesquise por título, autor ou ISBN. Tudo continua editável.</small></span>
        ${icon('chevronR')}</button>` : ''}
    <form class="form" novalidate autocomplete="off">
      <fieldset class="form-section">
        <div class="cover-editor">
          <div data-cover-prev>${cover({ ...book, cover: coverValue }, 'md')}</div>
          <div class="cover-editor-actions">
            <span class="field-label">Capa</span>
            <label class="btn btn-soft btn-sm">${icon('image')} Escolher imagem<input type="file" accept="image/*" data-file hidden></label>
            <button type="button" class="btn btn-ghost btn-sm" data-findcover>${icon('search')} Buscar capa</button>
            <button type="button" class="link-btn" data-rmcover ${coverValue ? '' : raw('hidden')}>remover capa</button>
          </div>
        </div>
      </fieldset>

      <label class="field" data-f="title"><span>Título <b class="req">*</b></span><input name="title" value="${book.title}" required maxlength="300"></label>
      <label class="field" data-f="author"><span>Autor(a) <b class="req">*</b></span><input name="author" value="${book.author}" required maxlength="300"></label>

      <div class="grid-2">
        <label class="field"><span>Status</span><select name="status">${Object.entries(STATUS).map(([k, v]) => html`<option value="${k}" ${sel(book.status, k)}>${v.label}</option>`)}</select></label>
        <label class="field"><span>Formato</span><select name="format">${Object.entries(FORMATS).map(([k, v]) => html`<option value="${k}" ${sel(book.format, k)}>${v}</option>`)}</select></label>
      </div>

      <div class="grid-2">
        <label class="field" data-f="pages"><span>Nº de páginas</span><input name="pages" type="number" inputmode="numeric" min="1" value="${book.pages || ''}"></label>
        <label class="field" data-f="currentPage" data-reading><span>Página atual</span><input name="currentPage" type="number" inputmode="numeric" min="0" value="${book.currentPage ?? ''}"></label>
      </div>

      <div class="grid-2" data-dates>
        <label class="field"><span>Início</span><input name="startDate" type="date" value="${book.startDate || ''}"></label>
        <label class="field" data-f="endDate"><span>Conclusão</span><input name="endDate" type="date" value="${book.endDate || ''}"></label>
      </div>

      <div class="field" data-rating-field><span class="field-label">Nota</span>${ratingInput('rating', book.rating)}</div>

      <fieldset class="form-section" data-wish>
        <legend>Próximas páginas</legend>
        <div class="form">
          <label class="field"><span>Por que quero ler</span><textarea name="wishReason" rows="2" placeholder="Uma indicação, uma curiosidade, um sentimento…">${book.wishReason || ''}</textarea></label>
          <div class="grid-2">
            <label class="field"><span>Prioridade</span><select name="priority">${Object.entries(PRIORITY).map(([k, v]) => html`<option value="${k}" ${sel(book.priority, k)}>${v}</option>`)}</select></label>
            <label class="field"><span>Adicionado em</span><input name="addedAt" type="date" value="${book.addedAt || todayISO()}"></label>
          </div>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend>Ficha do livro</legend>
        <div class="form">
          <div class="grid-2">
            <label class="field"><span>Gênero</span><input name="genre" list="genres" value="${book.genre || ''}"></label>
            <label class="field"><span>Subgênero</span><input name="subgenre" value="${book.subgenre || ''}"></label>
          </div>
          <datalist id="genres">${genres.map(g => html`<option value="${g}">`)}</datalist>
          <div class="grid-2">
            <label class="field"><span>Editora</span><input name="publisher" value="${book.publisher || ''}"></label>
            <label class="field"><span>Idioma</span><input name="language" list="langs" value="${book.language || ''}"></label>
          </div>
          <datalist id="langs"><option value="Português"><option value="Inglês"><option value="Espanhol"><option value="Francês"><option value="Italiano"><option value="Alemão"></datalist>
          <label class="field" data-f="isbn"><span>ISBN</span><input name="isbn" inputmode="numeric" value="${book.isbn || ''}" placeholder="978…"></label>
          <label class="field"><span>Sinopse / descrição</span><textarea name="description" rows="4">${book.description || ''}</textarea></label>
          <label class="field"><span>Tags</span><input name="tags" value="${(book.tags || []).join(', ')}" placeholder="ex.: clássico, releitura, clube do livro"></label>
          <label class="field"><span>Observações</span><textarea name="notes" rows="3" placeholder="Onde comprei, quem indicou, edição…">${book.notes || ''}</textarea></label>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend>O que senti</legend>
        <div class="pick-chips" data-feelings>
          ${feelings.map(f => html`<label style="--tone:${feelingTone(f)}"><input type="checkbox" name="feelings" value="${f}" ${(book.feelings || []).includes(f) ? raw('checked') : ''}><span>${f}</span></label>`)}
          <button type="button" class="chip" data-newfeeling>+ outro</button>
        </div>
      </fieldset>

      <fieldset class="form-section">
        <legend>Marcas pessoais</legend>
        <label class="switch"><span>Favorito</span><input type="checkbox" name="favorite" ${book.favorite ? raw('checked') : ''}></label>
        <label class="switch"><span>Livro que ficou <small class="muted" style="display:block">uma leitura marcante</small></span><input type="checkbox" name="memorable" ${book.memorable ? raw('checked') : ''}></label>
        <label class="field" data-memreason ${book.memorable ? '' : raw('hidden')}><span>Por que me marcou</span><textarea name="memorableReason" rows="3">${book.memorableReason || ''}</textarea></label>
      </fieldset>

      <div class="row-btns" style="position:sticky;bottom:calc(var(--nav-h) + 10px + var(--safe-b));z-index:4">
        <button type="button" class="btn btn-ghost" data-back style="background:var(--bg)">Cancelar</button>
        <button class="btn btn-primary">${editing ? 'Salvar alterações' : 'Adicionar à estante'}</button>
      </div>
    </form>
  `);
  bindRatings(root);
  const f = $('form', root);

  const syncVisibility = () => {
    const s = f.status.value;
    $('[data-wish]', root).hidden = s !== 'quero-ler';
    $('[data-reading]', root).style.visibility = (s === 'lendo' || s === 'pausado' || s === 'abandonado') ? 'visible' : 'hidden';
    $('[data-dates]', root).hidden = s === 'quero-ler';
    $('[data-rating-field]', root).hidden = s === 'quero-ler';
    $('[data-memreason]', root).hidden = !f.memorable.checked;
  };
  syncVisibility();
  f.addEventListener('change', syncVisibility);

  const setCover = v => {
    coverValue = v || '';
    $('[data-cover-prev]', root).innerHTML = String(cover({ title: f.title.value || 'Sem título', author: f.author.value, cover: coverValue }, 'md'));
    $('[data-rmcover]', root).hidden = !coverValue;
  };
  f.title.addEventListener('input', () => { if (!coverValue) setCover(''); });

  const fill = async r => {
    const set = (n, v) => { if (v !== undefined && v !== null && v !== '') f[n].value = v; };
    set('title', r.title); set('author', r.author); set('publisher', r.publisher); set('pages', r.pages);
    set('isbn', r.isbn); set('description', r.description); set('language', langName(r.language));
    if (r.genre && !f.genre.value) f.genre.value = r.genre;
    if (r.coverUrl) { setCover(r.coverUrl); localizeCover(r.coverUrl).then(v => { if (coverValue === r.coverUrl) setCover(v); }); }
    else setCover(coverValue);
    toast('Dados preenchidos — revise e ajuste o que quiser.');
  };

  root.onclick = async e => {
    if (e.target.closest('[data-search]')) openSearch(fill, f.title.value);
    if (e.target.closest('[data-rmcover]')) setCover('');
    if (e.target.closest('[data-findcover]')) {
      if (!f.title.value.trim() && !f.isbn.value.trim()) { toast('Informe o título ou ISBN para buscar a capa.', 'error'); return; }
      const btn = e.target.closest('[data-findcover]'); btn.disabled = true;
      try {
        const url = await findCover({ isbn: f.isbn.value.trim(), title: f.title.value.trim(), author: f.author.value.trim() });
        if (!url) toast('Nenhuma capa encontrada. Você pode enviar uma imagem.', 'error');
        else {
          const local = await localizeCover(url);
          // valida se a imagem realmente existe
          await new Promise((res, rej) => { const i = new Image(); i.onload = () => (i.width > 2 ? res() : rej()); i.onerror = rej; i.src = local; });
          setCover(local); toast('Capa encontrada');
        }
      } catch (err) { toast('Nenhuma capa encontrada. Você pode enviar uma imagem.', 'error'); }
      btn.disabled = false;
    }
    if (e.target.closest('[data-newfeeling]')) {
      const { promptDialog } = await import('../ui.js');
      const v = await promptDialog({ title: 'Novo sentimento', label: 'Nome', placeholder: 'ex.: Ternura' });
      if (!v || !v.trim()) return;
      const n = await addCustomFeeling(v);
      const lbl = document.createElement('label');
      lbl.style.setProperty('--tone', feelingTone(n));
      lbl.innerHTML = `<input type="checkbox" name="feelings" value="${esc(n)}" checked><span>${esc(n)}</span>`;
      e.target.closest('[data-newfeeling]').before(lbl);
    }
  };
  $('[data-file]', root).addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Escolha um arquivo de imagem.', 'error'); return; }
    try { setCover(await resizeImage(await readFileAsDataURL(file))); toast('Capa atualizada'); }
    catch (err) { toast('Não foi possível ler esta imagem.', 'error'); }
    e.target.value = '';
  });

  f.onsubmit = async e => {
    e.preventDefault();
    root.querySelectorAll('.field.invalid').forEach(x => { x.classList.remove('invalid'); x.querySelector('.err')?.remove(); });
    const errors = [];
    const err = (name, msg) => errors.push([name, msg]);
    const v = Object.fromEntries(new FormData(f).entries());
    const pages = v.pages ? Number(v.pages) : null;
    const cur = v.currentPage !== '' && v.currentPage !== undefined ? Number(v.currentPage) : null;
    if (!v.title.trim()) err('title', 'Dê um título ao livro.');
    if (!v.author.trim()) err('author', 'Informe o autor ou a autora.');
    if (pages !== null && (!Number.isInteger(pages) || pages < 1)) err('pages', 'Número de páginas inválido.');
    if (cur !== null && (cur < 0 || (pages && cur > pages))) err('currentPage', 'A página atual não pode passar do total.');
    if (v.startDate && v.endDate && v.endDate < v.startDate) err('endDate', 'A conclusão é anterior ao início.');
    const isbnDigits = (v.isbn || '').replace(/[^\dXx]/g, '');
    if (v.isbn && ![10, 13].includes(isbnDigits.length)) err('isbn', 'O ISBN costuma ter 10 ou 13 dígitos.');
    if (errors.length) {
      errors.forEach(([n, m]) => { const fld = root.querySelector(`[data-f="${n}"]`); if (fld) { fld.classList.add('invalid'); fld.insertAdjacentHTML('beforeend', `<small class="err">${esc(m)}</small>`); } });
      root.querySelector('.field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(errors[0][1], 'error');
      return;
    }
    const prevStatus = book.status;
    const prevPage = book.currentPage;
    Object.assign(book, {
      title: v.title.trim(), author: v.author.trim(), status: v.status, format: v.format,
      pages: pages || '', genre: v.genre.trim(), subgenre: v.subgenre.trim(), publisher: v.publisher.trim(), language: v.language.trim(),
      isbn: v.isbn.trim(), description: v.description.trim(), notes: v.notes.trim(), tags: parseTags(v.tags),
      startDate: v.status === 'quero-ler' ? (book.startDate || '') : v.startDate, endDate: v.status === 'quero-ler' ? '' : v.endDate,
      rating: Number(v.rating) || 0, favorite: f.favorite.checked, memorable: f.memorable.checked, memorableReason: v.memorableReason?.trim() || '',
      feelings: [...f.querySelectorAll('input[name="feelings"]:checked')].map(i => i.value),
      wishReason: v.wishReason?.trim() || book.wishReason || '', priority: v.priority || book.priority || 'media', addedAt: v.addedAt || book.addedAt || todayISO(),
      cover: coverValue,
    });
    if (cur !== null) book.currentPage = cur;
    if (book.status === 'concluido') {
      if (!book.endDate) book.endDate = todayISO();
      if (book.pages) book.currentPage = book.pages;
    }
    if (book.status === 'lendo' && !book.startDate) book.startDate = todayISO();
    if (book.status !== prevStatus || book.currentPage !== prevPage) {
      const note = book.status !== prevStatus ? (editing ? `Status: ${STATUS[book.status].label}` : 'Adicionado à estante') : '';
      if (book.status !== 'quero-ler' || !editing) book.progressLog = [...(book.progressLog || []), { date: todayISO(), page: book.currentPage || 0, note }];
    }
    book.isDemo = false;
    try {
      await db.put('books', book);
      toast(editing ? 'Alterações salvas' : 'Livro adicionado à estante');
      if (editing) back(); else go(`#/livro/${book.id}`, { replace: true });
    } catch (ex) {
      console.error(ex);
      toast('Não foi possível salvar. Verifique o espaço disponível.', 'error');
    }
  };
}

function openSearch(onPick, initial = '') {
  const { el, close } = openSheet(String(html`
    <form class="toolbar" data-form><div class="searchbar"><span class="ic">${raw(icons.search)}</span><input type="search" name="q" value="${initial}" placeholder="Título, autor ou ISBN" enterkeyhint="search" aria-label="Buscar livro"></div><button class="btn btn-primary btn-sm">Buscar</button></form>
    <div data-out><p class="hint center" style="padding:18px 0">A busca usa o Google Books e a Open Library. Apenas o termo pesquisado é enviado.</p></div>`), { title: 'Buscar livro' });
  const input = el.querySelector('input');
  setTimeout(() => input.focus(), 260);
  let results = [];
  el.querySelector('[data-form]').onsubmit = async e => {
    e.preventDefault();
    const out = el.querySelector('[data-out]');
    if (!input.value.trim()) return;
    out.innerHTML = '<div class="loading"></div>';
    try {
      results = await searchBooks(input.value);
      out.innerHTML = results.length ? String(html`<div class="search-results">${results.map((r, i) => html`
        <button data-i="${i}">${cover({ title: r.title, author: r.author, cover: r.coverUrl }, 'sm')}
          <div><h4>${r.title}</h4><p>${r.author}${r.year ? ` · ${r.year}` : ''}${r.pages ? ` · ${r.pages} p.` : ''}</p><p>${r.publisher || ''}${r.isbn ? ` · ISBN ${r.isbn}` : ''}</p></div></button>`)}</div>`)
        : '<p class="hint center" style="padding:18px 0">Nenhum resultado. Tente outro termo ou cadastre manualmente.</p>';
    } catch (err) { out.innerHTML = `<p class="hint center" style="padding:18px 0">${esc(err.message)}</p>`; }
  };
  el.querySelector('[data-out]').onclick = e => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    onPick(results[Number(b.dataset.i)]); close();
  };
  if (initial) el.querySelector('[data-form]').requestSubmit();
}
