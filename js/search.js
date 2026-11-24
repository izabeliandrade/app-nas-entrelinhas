// Busca em APIs públicas de livros (Google Books → Open Library)
// Nenhum dado pessoal é enviado: apenas o termo pesquisado.
import { resizeImage } from './utils.js';

const clean = s => (s || '').replace(/\s+/g, ' ').trim();
const isIsbn = q => /^[\d\-\sXx]{10,17}$/.test(q.trim()) && q.replace(/[^\dXx]/g, '').length >= 10;

async function fetchJSON(url, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function googleBooks(q) {
  const query = isIsbn(q) ? 'isbn:' + q.replace(/[^\dXx]/g, '') : q;
  const data = await fetchJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15&printType=books`);
  return (data.items || []).map(it => {
    const v = it.volumeInfo || {};
    const ids = v.industryIdentifiers || [];
    const isbn = (ids.find(i => i.type === 'ISBN_13') || ids.find(i => i.type === 'ISBN_10') || {}).identifier || '';
    const img = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail);
    return {
      title: clean([v.title, v.subtitle].filter(Boolean).join(': ')),
      author: (v.authors || []).join(', '),
      publisher: v.publisher || '',
      pages: v.pageCount || '',
      isbn,
      description: (v.description || '').replace(/<[^>]+>/g, ''),
      language: v.language || '',
      year: (v.publishedDate || '').slice(0, 4),
      genre: (v.categories || [])[0] || '',
      coverUrl: img ? img.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=2') : '',
      source: 'Google Books',
    };
  });
}

async function openLibrary(q) {
  const param = isIsbn(q) ? 'isbn=' + q.replace(/[^\dXx]/g, '') : 'q=' + encodeURIComponent(q);
  const data = await fetchJSON(`https://openlibrary.org/search.json?${param}&limit=15&fields=title,subtitle,author_name,publisher,number_of_pages_median,isbn,cover_i,first_publish_year,language,subject`);
  return (data.docs || []).map(d => ({
    title: clean([d.title, d.subtitle].filter(Boolean).join(': ')),
    author: (d.author_name || []).slice(0, 3).join(', '),
    publisher: (d.publisher || [])[0] || '',
    pages: d.number_of_pages_median || '',
    isbn: (d.isbn || []).find(i => i.length === 13) || (d.isbn || [])[0] || '',
    description: '',
    language: (d.language || [])[0] || '',
    year: d.first_publish_year || '',
    genre: '',
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
    source: 'Open Library',
  }));
}

export async function searchBooks(q) {
  q = (q || '').trim();
  if (!q) return [];
  if (!navigator.onLine) throw new Error('Sem conexão. Você pode cadastrar manualmente.');
  let results = [];
  try { results = await googleBooks(q); } catch (e) { /* tenta a próxima */ }
  if (results.length < 3) {
    try { results = results.concat(await openLibrary(q)); } catch (e) { if (!results.length) throw new Error('Não foi possível buscar agora. Tente novamente ou cadastre manualmente.'); }
  }
  // remove duplicados
  const seen = new Set();
  return results.filter(r => { const k = (r.isbn || r.title + r.author).toLowerCase(); if (!r.title || seen.has(k)) return false; seen.add(k); return true; });
}

const LANGS = { pt: 'Português', por: 'Português', en: 'Inglês', eng: 'Inglês', es: 'Espanhol', spa: 'Espanhol', fr: 'Francês', fre: 'Francês', it: 'Italiano', ita: 'Italiano', de: 'Alemão', ger: 'Alemão' };
export const langName = code => LANGS[code] || code || '';

// Busca uma capa apenas a partir do ISBN ou título+autor
export async function findCover({ isbn, title, author }) {
  if (isbn) {
    try {
      const r = await googleBooks(isbn);
      if (r[0]?.coverUrl) return r[0].coverUrl;
    } catch (e) { /* segue */ }
    return `https://covers.openlibrary.org/b/isbn/${isbn.replace(/[^\dXx]/g, '')}-L.jpg?default=false`;
  }
  const r = await searchBooks([title, author].filter(Boolean).join(' '));
  return r.find(x => x.coverUrl)?.coverUrl || '';
}

// Tenta salvar a capa localmente (funciona offline); se o servidor bloquear, mantém o link
export async function localizeCover(url) {
  if (!url || url.startsWith('data:')) return url;
  try { return await resizeImage(url, 480, 720, 0.85); } catch (e) { return url; }
}
