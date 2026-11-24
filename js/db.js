// Camada de dados — IndexedDB (local, privado, persistente e offline)
const DB_NAME = 'nas-entrelinhas';
const DB_VERSION = 1;
export const STORES = ['books', 'reviews', 'entries', 'quotes', 'settings'];

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('books')) {
        const s = db.createObjectStore('books', { keyPath: 'id' });
        s.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('reviews')) {
        const s = db.createObjectStore('reviews', { keyPath: 'id' });
        s.createIndex('bookId', 'bookId');
      }
      if (!db.objectStoreNames.contains('entries')) {
        const s = db.createObjectStore('entries', { keyPath: 'id' });
        s.createIndex('bookId', 'bookId');
      }
      if (!db.objectStoreNames.contains('quotes')) {
        const s = db.createObjectStore('quotes', { keyPath: 'id' });
        s.createIndex('bookId', 'bookId');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then(r => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transação abortada'));
  }));
}

const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// cache em memória para leituras rápidas
const cache = {};
const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(store) { listeners.forEach(fn => fn(store)); }

export async function all(store) {
  if (cache[store]) return cache[store];
  const db = await open();
  const items = await reqP(db.transaction(store).objectStore(store).getAll());
  cache[store] = items;
  return items;
}

export async function get(store, id) {
  const items = await all(store);
  return items.find(i => (i.id ?? i.key) === id) || null;
}

export async function put(store, item) {
  const now = new Date().toISOString();
  if (store !== 'settings') {
    item.createdAt = item.createdAt || now;
    item.updatedAt = now;
  }
  await tx(store, 'readwrite', s => s.put(item));
  delete cache[store];
  emit(store);
  return item;
}

export async function putMany(store, items) {
  await tx(store, 'readwrite', s => { items.forEach(i => s.put(i)); });
  delete cache[store];
  emit(store);
}

export async function remove(store, id) {
  await tx(store, 'readwrite', s => s.delete(id));
  delete cache[store];
  emit(store);
}

export async function clear(store) {
  await tx(store, 'readwrite', s => s.clear());
  delete cache[store];
  emit(store);
}

// Configurações (key/value)
export async function getSetting(key, fallback = null) {
  const s = await get('settings', key);
  return s ? s.value : fallback;
}
export async function setSetting(key, value) {
  return put('settings', { key, value });
}

// Remove um livro e tudo que está ligado a ele
export async function removeBookCascade(id) {
  for (const store of ['reviews', 'entries', 'quotes']) {
    const items = (await all(store)).filter(i => i.bookId === id);
    if (store === 'quotes' || store === 'entries') {
      // citações e pensamentos sobrevivem, desvinculados (mantém título do livro como referência)
      const book = await get('books', id);
      for (const i of items) { i.bookId = null; i.bookTitle = i.bookTitle || book?.title || ''; i.bookAuthor = i.bookAuthor || book?.author || ''; }
      if (items.length) await putMany(store, items);
    } else {
      for (const i of items) await tx(store, 'readwrite', s => s.delete(i.id));
      delete cache[store];
    }
  }
  await remove('books', id);
}

export async function exportAll() {
  const data = {};
  for (const s of STORES) data[s] = await all(s);
  return data;
}

export async function importAll(data, mode = 'replace') {
  for (const s of STORES) {
    if (!Array.isArray(data[s])) continue;
    if (mode === 'replace') await clear(s);
    await putMany(s, data[s]);
  }
}

export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) return await navigator.storage.persist();
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}
