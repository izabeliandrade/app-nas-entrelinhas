import * as db from '../db.js';
import { uid, todayISO } from '../utils.js';
import { emptyState } from '../ui.js';
import { mountWriter } from '../writer.js';

export async function render({ root, params, query, go, back }) {
  let item, isNew = !params.id;
  if (isNew) {
    const book = query.book ? await db.get('books', query.book) : null;
    item = { id: uid(), bookId: book ? book.id : null, date: query.date || todayISO(), page: book && book.status === 'lendo' && book.currentPage ? book.currentPage : '', text: '', tags: [], feeling: '' };
  } else {
    item = await db.get('entries', params.id);
    if (!item) { root.innerHTML = String(emptyState('Este registro não existe mais.', '')); return; }
    item = structuredClone(item);
  }
  return mountWriter({ root, store: 'entries', item, isNew, kind: 'entry', go, back });
}
