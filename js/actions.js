// Ações de domínio compartilhadas entre telas
import * as db from './db.js';
import { todayISO, esc } from './utils.js';
import { openSheet, toast, confirmDialog } from './ui.js';
import { progressOf } from './model.js';

// Atualiza a página atual e registra o histórico
export function updateProgress(book) {
  return new Promise(resolve => {
    let done = false;
    const { el, close } = openSheet(`
      <form class="form" novalidate>
        <p class="muted small" style="margin-top:-4px">${esc(book.title)}</p>
        <div class="grid-2">
          <label class="field"><span>Página atual</span><input name="current" type="number" inputmode="numeric" min="0" value="${esc(book.currentPage || '')}" required></label>
          <label class="field"><span>Total de páginas</span><input name="pages" type="number" inputmode="numeric" min="1" value="${esc(book.pages || '')}"></label>
        </div>
        <label class="field"><span>Data</span><input name="date" type="date" value="${todayISO()}"></label>
        <p class="hint" data-pct></p>
        <div class="row-btns"><button class="btn btn-primary">Salvar progresso</button></div>
      </form>`, { title: 'Onde você está?', onClose: () => { if (!done) resolve(false); } });
    const f = el.querySelector('form');
    const pct = () => {
      const c = Number(f.current.value), p = Number(f.pages.value);
      el.querySelector('[data-pct]').textContent = p ? `${Math.min(100, Math.round(c / p * 100))}% lido · faltam ${Math.max(0, p - c)} páginas` : '';
    };
    f.addEventListener('input', pct); pct();
    setTimeout(() => { f.current.focus(); f.current.select(); }, 280);
    f.onsubmit = async e => {
      e.preventDefault();
      const current = Number(f.current.value), pages = Number(f.pages.value) || book.pages || 0;
      if (f.current.value === '' || current < 0) { toast('Informe a página atual.', 'error'); return; }
      if (pages && current > pages) { toast('A página atual é maior que o total de páginas.', 'error'); return; }
      book.pages = pages || book.pages;
      book.currentPage = current;
      book.progressLog = [...(book.progressLog || []), { date: f.date.value || todayISO(), page: current }];
      if (book.status === 'quero-ler' || book.status === 'pausado') { book.status = 'lendo'; book.startDate = book.startDate || f.date.value || todayISO(); }
      await db.put('books', book);
      done = true; close();
      toast('Progresso salvo');
      if (pages && current >= pages && book.status !== 'concluido') {
        const ok = await confirmDialog({ title: 'Última página!', message: 'Você chegou ao fim. Deseja marcar este livro como concluído?', confirm: 'Marcar como concluído', cancel: 'Ainda não', danger: false });
        if (ok) await finishBook(book, f.date.value);
      }
      resolve(true);
    };
  });
}

export async function finishBook(book, date = todayISO()) {
  book.status = 'concluido';
  book.endDate = book.endDate || date;
  book.startDate = book.startDate || date;
  if (book.pages) book.currentPage = book.pages;
  book.progressLog = [...(book.progressLog || []), { date, page: book.pages || book.currentPage || 0, note: 'Concluído' }];
  await db.put('books', book);
  toast('Mais uma história guardada na sua estante.');
}

export async function startReading(book) {
  book.status = 'lendo';
  book.startDate = todayISO();
  book.currentPage = book.currentPage || 0;
  book.progressLog = [...(book.progressLog || []), { date: todayISO(), page: book.currentPage, note: 'Início da leitura' }];
  await db.put('books', book);
  toast('Boa leitura! O livro agora está em “Lendo”.');
}

export async function setStatus(book, status) {
  const prev = book.status;
  book.status = status;
  if (status === 'lendo' && !book.startDate) book.startDate = todayISO();
  if (status === 'concluido') return finishBook(book);
  if (prev !== status) book.progressLog = [...(book.progressLog || []), { date: todayISO(), page: book.currentPage || 0, note: { lendo: 'Retomado', pausado: 'Pausado', abandonado: 'Abandonado', 'quero-ler': 'Voltou para a lista' }[status] }];
  await db.put('books', book);
  toast('Status atualizado');
}

export { progressOf };
