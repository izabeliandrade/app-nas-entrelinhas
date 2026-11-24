// Backup, restauração e exportação (JSON / CSV)
import * as db from './db.js';
import { download, todayISO, fmtDate } from './utils.js';
import { STATUS, FORMATS, PRIORITY, computeStats, yearsWithData, getGoal } from './model.js';

const APP = 'nas-entrelinhas';
const VERSION = 1;

export async function backupJSON() {
  const data = await db.exportAll();
  const payload = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data };
  download(`nas-entrelinhas-backup-${todayISO()}.json`, JSON.stringify(payload, null, 2));
  await db.setSetting('lastBackup', new Date().toISOString());
}

export async function exportPart(kind) {
  const data = await db.exportAll();
  const subset = { books: data.books, reviews: data.reviews, quotes: data.quotes, entries: data.entries }[kind];
  download(`nas-entrelinhas-${kind}-${todayISO()}.json`, JSON.stringify({ app: APP, version: VERSION, kind, exportedAt: new Date().toISOString(), items: subset }, null, 2));
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  return /[";\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(headers, rows) {
  const lines = [headers.map(h => csvCell(h[0])).join(',')];
  rows.forEach(r => lines.push(headers.map(h => csvCell(h[1](r))).join(',')));
  return '﻿' + lines.join('\r\n'); // BOM para abrir corretamente no Excel
}

export async function exportCSV(kind) {
  const books = await db.all('books');
  const bmap = new Map(books.map(b => [b.id, b]));
  const bt = i => bmap.get(i.bookId)?.title || i.bookTitle || '';
  const ba = i => i.author || bmap.get(i.bookId)?.author || i.bookAuthor || '';
  let csv;
  if (kind === 'books') {
    csv = toCSV([
      ['Título', b => b.title], ['Autor', b => b.author], ['ISBN', b => b.isbn], ['Editora', b => b.publisher], ['Páginas', b => b.pages],
      ['Gênero', b => b.genre], ['Subgênero', b => b.subgenre], ['Idioma', b => b.language], ['Formato', b => FORMATS[b.format]],
      ['Status', b => STATUS[b.status]?.label], ['Página atual', b => b.currentPage], ['Início', b => b.startDate], ['Conclusão', b => b.endDate],
      ['Nota', b => b.rating || ''], ['Favorito', b => (b.favorite ? 'sim' : '')], ['Livro que ficou', b => (b.memorable ? 'sim' : '')],
      ['Por que me marcou', b => b.memorableReason], ['Sentimentos', b => b.feelings], ['Tags', b => b.tags], ['Observações', b => b.notes],
      ['Motivo para ler', b => b.wishReason], ['Prioridade', b => PRIORITY[b.priority] || ''], ['Adicionado em', b => b.addedAt],
    ], books);
  } else if (kind === 'reviews') {
    csv = toCSV([['Data', r => r.date], ['Livro', bt], ['Autor', ba], ['Título', r => r.title], ['Nota', r => r.rating || ''], ['Tags', r => r.tags], ['Texto', r => r.text]], (await db.all('reviews')).filter(r => (r.text || '').trim()));
  } else if (kind === 'quotes') {
    csv = toCSV([['Data', q => q.date], ['Trecho', q => q.text], ['Livro', bt], ['Autor', ba], ['Página', q => q.page], ['Comentário', q => q.comment], ['Tags', q => q.tags], ['Favorito', q => (q.favorite ? 'sim' : '')]], await db.all('quotes'));
  } else if (kind === 'entries') {
    csv = toCSV([['Data', e => e.date], ['Livro', bt], ['Página', e => e.page], ['Sentimento', e => e.feeling], ['Tags', e => e.tags], ['Texto', e => e.text]], (await db.all('entries')).filter(e => (e.text || '').trim()));
  } else if (kind === 'stats') {
    const [reviews, entries, quotes] = await Promise.all([db.all('reviews'), db.all('entries'), db.all('quotes')]);
    const years = yearsWithData(books, reviews, entries, quotes);
    const rows = [];
    for (const y of years) {
      const s = computeStats(books, y, { reviews, quotes });
      rows.push({ y, s, goal: await getGoal(y) });
    }
    csv = toCSV([
      ['Ano', r => r.y], ['Livros lidos', r => r.s.doneCount], ['Meta', r => r.goal], ['% da meta', r => Math.round(r.s.doneCount / (r.goal || 1) * 100)],
      ['Páginas', r => r.s.totalPages], ['Média de notas', r => r.s.avgRating ? r.s.avgRating.toFixed(2) : ''], ['Média de páginas', r => r.s.avgPages],
      ['Gênero mais lido', r => r.s.genres[0]?.[0] || ''], ['Autor mais lido', r => r.s.authors[0]?.[0] || ''],
      ['Livro mais longo', r => r.s.longest?.title || ''], ['Livro mais curto', r => r.s.shortest?.title || ''],
      ...['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => [`Livros ${m}`, r => r.s.byMonth[i]]),
      ['Resenhas', r => r.s.reviews.length], ['Fragmentos', r => r.s.quotes.length],
    ], rows);
  }
  download(`nas-entrelinhas-${kind}-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8');
}

// Valida e restaura um backup
export async function readBackupFile(file) {
  const text = await file.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('O arquivo não é um JSON válido.'); }
  const data = json && json.app === APP && json.data ? json.data : null;
  if (!data) throw new Error('Este arquivo não parece ser um backup do Nas Entrelinhas.');
  for (const k of ['books', 'reviews', 'entries', 'quotes']) {
    if (data[k] !== undefined && !Array.isArray(data[k])) throw new Error('Backup corrompido: ' + k);
    (data[k] || []).forEach(i => { if (!i || typeof i.id !== 'string') throw new Error('Backup com registros inválidos.'); });
  }
  if (data.settings && !Array.isArray(data.settings)) throw new Error('Backup corrompido: configurações');
  return {
    data,
    summary: { books: (data.books || []).length, reviews: (data.reviews || []).length, entries: (data.entries || []).length, quotes: (data.quotes || []).length, exportedAt: json.exportedAt },
  };
}

export async function restore(data, mode) {
  const clean = { ...data };
  if (mode === 'merge' && clean.settings) {
    // ao mesclar, preserva as configurações atuais (nome, tema, PIN), mas mescla sentimentos e metas
    const cur = await db.exportAll();
    const curMap = new Map(cur.settings.map(s => [s.key, s.value]));
    clean.settings = clean.settings.filter(s => ['customFeelings', 'goals'].includes(s.key)).map(s => {
      const c = curMap.get(s.key);
      if (s.key === 'customFeelings') return { key: s.key, value: [...new Set([...(c || []), ...(s.value || [])])] };
      if (s.key === 'goals') return { key: s.key, value: { ...(s.value || {}), ...(c || {}) } };
      return s;
    });
  }
  await db.importAll(clean, mode);
}

export function lastBackupLabel(iso) { return iso ? `último backup em ${fmtDate(iso)}` : 'nenhum backup feito ainda'; }
