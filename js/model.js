// Definições do domínio e funções de leitura dos dados
import * as db from './db.js';
import { yearOf, monthOf, todayISO, countBy, parseDate } from './utils.js';

export const STATUS = {
  'quero-ler': { label: 'Quero ler', short: 'Quero ler' },
  'lendo': { label: 'Lendo', short: 'Lendo' },
  'concluido': { label: 'Concluído', short: 'Concluído' },
  'pausado': { label: 'Pausado', short: 'Pausado' },
  'abandonado': { label: 'Abandonado', short: 'Abandonado' },
};
export const FORMATS = { fisico: 'Livro físico', ebook: 'Ebook', audiobook: 'Audiobook' };
export const PRIORITY = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

export const GENRES = ['Romance', 'Ficção literária', 'Clássico', 'Fantasia', 'Ficção científica', 'Mistério', 'Suspense', 'Terror', 'Poesia', 'Contos', 'Crônicas', 'Drama', 'Biografia', 'Memórias', 'Ensaio', 'Filosofia', 'História', 'Psicologia', 'Não ficção', 'Autoajuda', 'Juvenil', 'Infantil', 'HQ / Graphic novel', 'Distopia', 'Romance histórico'];

export const DEFAULT_FEELINGS = ['Melancolia', 'Alegria', 'Nostalgia', 'Angústia', 'Esperança', 'Amor', 'Revolta', 'Paz', 'Confusão', 'Inspiração', 'Tristeza', 'Fascínio', 'Desconforto', 'Saudade', 'Reflexão'];

// tons suaves para sentimentos, ciclando pela paleta
const FEEL_TONES = ['#B98B78', '#858C72', '#705746', '#C9A88E', '#9AA084', '#A47764', '#8C7A6B', '#B5A58F', '#6E7560', '#C29C88'];
export function feelingTone(name) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FEEL_TONES[h % FEEL_TONES.length];
}

export async function getFeelings() {
  const custom = await db.getSetting('customFeelings', []);
  return [...DEFAULT_FEELINGS, ...custom.filter(f => !DEFAULT_FEELINGS.includes(f))];
}

export const LITERARY_LINES = [
  { text: 'Ler é sonhar pela mão de outrem.', author: 'Fernando Pessoa', book: 'Livro do Desassossego' },
  { text: 'Sempre imaginei que o paraíso fosse uma espécie de biblioteca.', author: 'Jorge Luis Borges' },
  { text: 'Os livros não mudam o mundo, quem muda o mundo são as pessoas. Os livros só mudam as pessoas.', author: 'Mario Quintana' },
  { text: 'Um livro tem de ser o machado para o mar congelado dentro de nós.', author: 'Franz Kafka' },
  { text: 'Tudo vale a pena se a alma não é pequena.', author: 'Fernando Pessoa', book: 'Mensagem' },
  { text: 'Quem não lê, aos 70 anos terá vivido apenas uma vida. Quem lê terá vivido cinco mil anos.', author: 'Umberto Eco' },
  { text: 'Um país se faz com homens e livros.', author: 'Monteiro Lobato' },
  { text: 'Não há fragata como um livro para nos levar a terras distantes.', author: 'Emily Dickinson' },
  { text: 'Lemos para saber que não estamos sozinhos.', author: 'atribuída a C. S. Lewis' },
  { text: 'O que a memória ama fica eterno.', author: 'Adélia Prado' },
];

// número estável por dia (para escolher a frase de hoje)
export function daySeed() { const d = todayISO().replace(/-/g, ''); return Number(d); }

export function progressOf(b) {
  if (!b.pages) return b.status === 'concluido' ? 100 : 0;
  if (b.status === 'concluido') return 100;
  return Math.max(0, Math.min(100, Math.round(((b.currentPage || 0) / b.pages) * 100)));
}

export const isRead = b => b.status === 'concluido';
export const readYear = b => yearOf(b.endDate) || (b.status === 'concluido' ? yearOf(b.updatedAt) : null);

export async function bookMap() {
  const books = await db.all('books');
  return new Map(books.map(b => [b.id, b]));
}

export async function getGoal(year) {
  const goals = await db.getSetting('goals', {});
  return goals[year] ?? (await db.getSetting('defaultGoal', 12));
}

export function yearsWithData(books, reviews = [], entries = [], quotes = []) {
  const ys = new Set([new Date().getFullYear()]);
  books.forEach(b => { const y = readYear(b); if (y) ys.add(y); const s = yearOf(b.startDate); if (s) ys.add(s); });
  [...reviews, ...entries, ...quotes].forEach(i => { const y = yearOf(i.date); if (y) ys.add(y); });
  return [...ys].sort((a, b) => b - a);
}

// Estatísticas por ano (year = null → todos os anos)
export function computeStats(books, year, { reviews = [], quotes = [] } = {}) {
  const done = books.filter(b => isRead(b) && (!year || readYear(b) === year));
  const byMonth = Array(12).fill(0), pagesByMonth = Array(12).fill(0);
  done.forEach(b => { const m = monthOf(b.endDate); if (m !== null) { byMonth[m]++; pagesByMonth[m] += Number(b.pages) || 0; } });
  const totalPages = done.reduce((s, b) => s + (Number(b.pages) || 0), 0);
  const rated = done.filter(b => b.rating > 0);
  const avgRating = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : 0;
  const withPages = done.filter(b => Number(b.pages) > 0);
  const longest = withPages.slice().sort((a, b) => b.pages - a.pages)[0] || null;
  const shortest = withPages.slice().sort((a, b) => a.pages - b.pages)[0] || null;
  const genres = countBy(done, b => b.genre);
  const authors = countBy(done, b => b.author);
  const ratingDist = [1, 2, 3, 4, 5].map(r => rated.filter(b => Math.ceil(b.rating) === r).length);
  const favorite = rated.slice().sort((a, b) => b.rating - a.rating || (parseDate(b.endDate) - parseDate(a.endDate)))[0] || null;
  return {
    done, total: books.length, doneCount: done.length, totalPages, avgRating, byMonth, pagesByMonth,
    longest, shortest, genres, authors, ratingDist, favorite,
    avgPages: withPages.length ? Math.round(withPages.reduce((s, b) => s + Number(b.pages), 0) / withPages.length) : 0,
    favorites: books.filter(b => b.favorite),
    abandoned: books.filter(b => b.status === 'abandonado'),
    paused: books.filter(b => b.status === 'pausado'),
    memorable: done.filter(b => b.memorable),
    reviews: reviews.filter(r => !year || yearOf(r.date) === year),
    quotes: quotes.filter(q => !year || yearOf(q.date) === year),
  };
}
