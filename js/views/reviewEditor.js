import * as db from '../db.js';
import { uid, todayISO } from '../utils.js';
import { emptyState } from '../ui.js';
import { mountWriter } from '../writer.js';

export async function render({ root, params, query, go, back }) {
  let item, isNew = !params.id;
  if (isNew) {
    const book = query.book ? await db.get('books', query.book) : null;
    item = { id: uid(), bookId: book ? book.id : null, date: todayISO(), title: '', text: '', rating: book?.rating || 0, tags: [] };
  } else {
    item = await db.get('reviews', params.id);
    if (!item) { root.innerHTML = String(emptyState('Esta resenha não existe mais.', '')); return; }
    item = structuredClone(item);
  }
  return mountWriter({ root, store: 'reviews', item, isNew, kind: 'review', go, back });
}
