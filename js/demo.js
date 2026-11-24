// Dados de demonstração — sempre marcados com isDemo e removíveis com um toque
import * as db from './db.js';
import { uid, pad } from './utils.js';
import { confirmDialog, toast } from './ui.js';

export async function loadDemo() {
  const Y = new Date().getFullYear();
  const M = new Date().getMonth() + 1;
  const d = (y, m, day) => `${y}-${pad(Math.max(1, Math.min(12, m)))}-${pad(day)}`;
  const mm = k => Math.max(1, Math.min(M, k)); // meses já passados no ano atual
  const B = (o) => ({ id: uid(), isDemo: true, format: 'fisico', language: 'Português', tags: [], feelings: [], progressLog: [], addedAt: d(Y - 1, 11, 2), ...o });

  const books = [
    B({ title: 'Dom Casmurro', author: 'Machado de Assis', pages: 256, genre: 'Clássico', subgenre: 'Romance realista', status: 'concluido', startDate: d(Y, mm(1), 4), endDate: d(Y, mm(1), 22), rating: 5, favorite: true, memorable: true, memorableReason: 'Porque me ensinou que toda história depende de quem a conta.', feelings: ['Fascínio', 'Desconforto', 'Reflexão'], tags: ['clássico brasileiro'] }),
    B({ title: 'Orgulho e Preconceito', author: 'Jane Austen', pages: 424, genre: 'Romance', subgenre: 'Romance de costumes', status: 'concluido', startDate: d(Y, mm(2), 1), endDate: d(Y, mm(2), 26), rating: 4.5, favorite: true, feelings: ['Alegria', 'Amor'], format: 'ebook' }),
    B({ title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', pages: 208, genre: 'Clássico', status: 'concluido', startDate: d(Y, mm(3), 3), endDate: d(Y, mm(3), 19), rating: 4.5, feelings: ['Reflexão', 'Melancolia'] }),
    B({ title: 'A Metamorfose', author: 'Franz Kafka', pages: 104, genre: 'Ficção literária', status: 'concluido', startDate: d(Y, mm(4), 8), endDate: d(Y, mm(4), 11), rating: 4, feelings: ['Angústia', 'Desconforto'] }),
    B({ title: 'Frankenstein', author: 'Mary Shelley', pages: 280, genre: 'Ficção científica', subgenre: 'Gótico', status: 'concluido', startDate: d(Y, mm(5), 2), endDate: d(Y, mm(6), 1), rating: 4, memorable: true, memorableReason: 'A solidão da criatura ficou comigo por semanas.', feelings: ['Melancolia', 'Tristeza'], format: 'audiobook' }),
    B({ title: 'Mrs. Dalloway', author: 'Virginia Woolf', pages: 232, genre: 'Ficção literária', subgenre: 'Modernismo', status: 'lendo', startDate: d(Y, M, 1), currentPage: 118, feelings: ['Nostalgia'], progressLog: [{ date: d(Y, M, 1), page: 0, note: 'Início da leitura' }, { date: d(Y, M, 6), page: 64 }, { date: d(Y, M, 12), page: 118 }] }),
    B({ title: 'O Cortiço', author: 'Aluísio Azevedo', pages: 304, genre: 'Clássico', subgenre: 'Naturalismo', status: 'pausado', startDate: d(Y, mm(7), 10), currentPage: 92 }),
    B({ title: 'Senhora', author: 'José de Alencar', pages: 248, genre: 'Romance', status: 'quero-ler', priority: 'alta', wishReason: 'Quero comparar com Machado — dizem que conversa com Dom Casmurro.', tags: ['clube do livro'] }),
    B({ title: 'O Morro dos Ventos Uivantes', author: 'Emily Brontë', pages: 416, genre: 'Romance', subgenre: 'Gótico', status: 'quero-ler', priority: 'media', wishReason: 'Para um dia chuvoso, com café.' }),
    B({ title: 'Persuasão', author: 'Jane Austen', pages: 288, genre: 'Romance', status: 'concluido', startDate: d(Y - 1, 10, 3), endDate: d(Y - 1, 10, 29), rating: 4 }),
  ];
  const by = t => books.find(b => b.title === t).id;
  const reviews = [
    { id: uid(), isDemo: true, bookId: by('Dom Casmurro'), date: d(Y, mm(1), 23), title: 'O narrador que não confia em si mesmo', rating: 5, tags: ['narrador'], text: '(Texto de exemplo) Terminei com a sensação de ter sido conduzida por alguém que precisava muito que eu acreditasse nele. A dúvida não está em Capitu, mas na memória de quem conta.\n\nVoltei várias vezes aos capítulos curtos, como quem relê uma carta antiga.' },
    { id: uid(), isDemo: true, bookId: by('Orgulho e Preconceito'), date: d(Y, mm(2), 27), title: '', rating: 4.5, tags: [], text: '(Texto de exemplo) A ironia é tão fina que às vezes passa despercebida. Elizabeth é uma das personagens mais vivas que já encontrei.' },
  ];
  const entries = [
    { id: uid(), isDemo: true, bookId: by('Mrs. Dalloway'), date: d(Y, M, 6), page: 64, feeling: 'Nostalgia', tags: ['tempo'], text: '(Registro de exemplo) O livro inteiro parece acontecer dentro de um único respiro. Os sinos de Londres marcam o tempo, mas as lembranças não obedecem a ele.' },
    { id: uid(), isDemo: true, bookId: by('Frankenstein'), date: d(Y, mm(5), 20), page: 140, feeling: 'Tristeza', tags: ['personagens'], text: '(Registro de exemplo) Quem é o monstro aqui? A pergunta muda de resposta a cada capítulo.' },
    { id: uid(), isDemo: true, bookId: null, date: d(Y, mm(4), 15), feeling: 'Reflexão', tags: ['leitura'], text: '(Registro de exemplo) Percebi que leio mais devagar quando o livro me pede silêncio.' },
  ];
  const quotes = [
    { id: uid(), isDemo: true, bookId: by('Memórias Póstumas de Brás Cubas'), page: 207, date: d(Y, mm(3), 19), favorite: true, style: 'cafe', tags: ['finais'], comment: 'O final mais amargo e mais lúcido.', text: 'Não tive filhos, não transmiti a nenhuma criatura o legado da nossa miséria.' },
    { id: uid(), isDemo: true, bookId: by('Orgulho e Preconceito'), page: 1, date: d(Y, mm(2), 1), favorite: false, style: 'creme', tags: ['primeiras linhas'], comment: '', text: 'É uma verdade universalmente reconhecida que um homem solteiro, possuidor de uma boa fortuna, deve estar necessitado de uma esposa.' },
    { id: uid(), isDemo: true, bookId: by('Mrs. Dalloway'), page: 1, date: d(Y, M, 1), favorite: true, style: 'oliva', tags: ['primeiras linhas'], comment: 'Uma frase simples que abre um mundo.', text: 'A Sra. Dalloway disse que ela própria iria comprar as flores.' },
    { id: uid(), isDemo: true, bookId: by('Dom Casmurro'), page: 62, date: d(Y, mm(1), 10), favorite: false, style: 'papel', tags: ['Capitu'], comment: '', text: 'Olhos de cigana oblíqua e dissimulada.' },
  ];
  await db.putMany('books', books.map(b => ({ ...b, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })));
  await db.putMany('reviews', reviews);
  await db.putMany('entries', entries);
  await db.putMany('quotes', quotes);
  toast('Dados de exemplo carregados — remova quando quiser.');
}

export async function removeDemo() {
  if (!(await confirmDialog({ title: 'Remover dados de exemplo?', message: 'Apenas os registros de demonstração serão apagados. O que você criou permanece.', confirm: 'Remover' }))) return false;
  for (const s of ['books', 'reviews', 'entries', 'quotes']) {
    for (const i of (await db.all(s)).filter(x => x.isDemo)) await db.remove(s, i.id);
  }
  // registros reais que apontavam para livros de exemplo ficam sem vínculo
  const ids = new Set((await db.all('books')).map(b => b.id));
  for (const s of ['reviews', 'entries', 'quotes']) {
    const orphans = (await db.all(s)).filter(x => x.bookId && !ids.has(x.bookId));
    if (orphans.length) await db.putMany(s, orphans.map(o => ({ ...o, bookId: null })));
  }
  toast('Dados de exemplo removidos');
  return true;
}
