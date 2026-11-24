// Importação única dos livros e resenhas do diário original da Izabeli
// (convertidos do HTML "Nas Entrelinhas — Diário de Leitura").
// Roda uma vez por aparelho; não duplica livros já cadastrados com o mesmo título.
import * as db from './db.js';
import { norm, todayISO } from './utils.js';

const SEED_KEY = 'seed-izabeli-v1';
const BOOKS = [
 {
  "title": "Vou te Receitar um Gato",
  "author": "Ishida Syou",
  "status": "concluido",
  "format": "fisico",
  "language": "Português",
  "rating": 4.2,
  "tags": [
   "gatinhos",
   "literatura de cura"
  ],
  "feelings": [
   "Paz",
   "Esperança"
  ],
  "id": "izb-gato",
  "cover": "covers/vou-te-receitar-um-gato.jpg",
  "genre": "Literatura japonesa",
  "subgenre": "Iyashikei (literatura de cura)",
  "pages": 200,
  "currentPage": 200,
  "publisher": "",
  "memorable": false,
  "memorableReason": "",
  "favorite": false,
  "startDate": "",
  "endDate": "",
  "notes": "",
  "description": "",
  "isbn": ""
 },
 {
  "title": "Jantar Secreto",
  "author": "Raphael Montes",
  "status": "concluido",
  "format": "fisico",
  "language": "Português",
  "rating": 4.5,
  "tags": [
   "nacional"
  ],
  "feelings": [
   "Desconforto",
   "Fascínio"
  ],
  "id": "izb-jantar",
  "cover": "covers/jantar-secreto.jpg",
  "genre": "Suspense",
  "subgenre": "Thriller psicológico, horror, humor negro",
  "pages": 360,
  "currentPage": 360,
  "publisher": "",
  "memorable": false,
  "memorableReason": "",
  "favorite": false,
  "startDate": "",
  "endDate": "",
  "notes": "",
  "description": "",
  "isbn": ""
 },
 {
  "title": "As vacas não me olham mais na cara",
  "author": "Dora Freind",
  "status": "concluido",
  "format": "fisico",
  "language": "Português",
  "rating": 5.0,
  "tags": [
   "nacional",
   "infância"
  ],
  "feelings": [
   "Reflexão",
   "Melancolia"
  ],
  "id": "izb-vacas",
  "cover": "covers/as-vacas-nao-me-olham-mais-na-cara.jpg",
  "genre": "Ficção literária",
  "subgenre": "Romance de formação",
  "pages": "",
  "currentPage": "",
  "publisher": "Nós",
  "memorable": false,
  "memorableReason": "",
  "favorite": false,
  "startDate": "",
  "endDate": "",
  "notes": "",
  "description": "",
  "isbn": ""
 },
 {
  "title": "O peso do pássaro morto",
  "author": "Aline Bei",
  "status": "concluido",
  "format": "fisico",
  "language": "Português",
  "rating": 5.0,
  "tags": [
   "nacional",
   "luto"
  ],
  "feelings": [
   "Tristeza",
   "Reflexão",
   "Melancolia"
  ],
  "id": "izb-passaro",
  "cover": "covers/o-peso-do-passaro-morto.jpg",
  "genre": "Ficção literária",
  "subgenre": "Romance contemporâneo",
  "pages": "",
  "currentPage": "",
  "publisher": "Nós",
  "memorable": true,
  "memorableReason": "Esse é o tipo de livro que não termina exatamente quando chegamos à última página.",
  "favorite": false,
  "startDate": "",
  "endDate": "",
  "notes": "",
  "description": "",
  "isbn": ""
 },
 {
  "title": "A Metamorfose",
  "author": "Franz Kafka",
  "status": "concluido",
  "format": "fisico",
  "language": "Português",
  "rating": 5.0,
  "tags": [
   "clássico"
  ],
  "feelings": [
   "Desconforto",
   "Reflexão",
   "Tristeza"
  ],
  "id": "izb-metamorfose",
  "cover": "covers/a-metamorfose.jpg",
  "genre": "Clássico",
  "subgenre": "Alegoria",
  "pages": "",
  "currentPage": "",
  "publisher": "",
  "memorable": true,
  "memorableReason": "Uma obra que, apesar de triste, provoca questionamentos difíceis e continua ecoando depois que terminamos de ler.",
  "favorite": false,
  "startDate": "",
  "endDate": "",
  "notes": "",
  "description": "",
  "isbn": ""
 }
];
const REVIEWS = [
 {
  "id": "izb-gato-resenha",
  "bookId": "izb-gato",
  "title": "",
  "text": "A premissa (sem spoilers)\n\nEscondida em uma ruazinha tranquila de Kyoto, a Clínica Psiquiátrica Kokorogoro só é encontrada por pessoas em sofrimento emocional profundo. O excêntrico Doutor Nikko ouve os pacientes e, em vez de remédios ou longas sessões de terapia, faz um diagnóstico inusitado: um gato temporário para levar para casa.\n\nA história se divide em episódios com diferentes personagens: um funcionário à beira do burnout, uma mãe de família que se sente invisível, um jovem perdido sobre o próprio futuro e uma mulher lidando com o luto e a solidão.\n\nMinha experiência\n\nUma narrativa poética e serena que funciona como uma pausa e um abraço aconchegante nos dias difíceis. Diferente de histórias com grandes reviravoltas, o charme aqui está no acolhimento: a escrita de Ishida é atenta aos pequenos detalhes do cotidiano.\n\nOs gatos não têm nada de mágico no sentido literal — a magia está em como a presença exigente de um bichano força os personagens a saírem da própria cabeça, estabelecerem uma rotina e focarem no momento presente. O livro também trata temas sérios (pressão no trabalho, solidão, luto) com muita delicadeza, sem nunca ficar pesado ou melodramático.\n\n“Os gatos atuam como um espelho que revela o que está quebrado por dentro de cada personagem — e ajuda a consertar.”\n\nPontos fortes\n• Leitura leve, reconfortante e rápida\n• Personagens humanos e muito identificáveis\n• Um prato cheio para quem ama animais\n\nPontos de atenção\n• Estrutura episódica pode parecer repetitiva\n• Ritmo desacelerado, sem grandes sobressaltos\n• Soluções simples para questões emocionais complexas\n\nVeredito final\n\nUma leitura extremamente delicada e reconfortante — o livro perfeito para uma pausa na correria do dia a dia ou para quem quer uma história leve que aqueça o coração.",
  "rating": 4.2,
  "tags": []
 },
 {
  "id": "izb-jantar-resenha",
  "bookId": "izb-jantar",
  "title": "",
  "text": "A premissa (sem spoilers)\n\nQuatro amigos de infância saem do interior da Paraíba para tentar a vida no Rio de Janeiro enquanto cursam a faculdade. Morando juntos em Copacabana, eles se veem à beira do despejo por uma dívida de aluguel gigantesca. Desesperados, têm uma ideia arriscada: organizar jantares clandestinos e caríssimos para a alta sociedade carioca. O problema começa quando uma brincadeira toma proporções catastróficas e o menu passa a incluir um ingrediente impensável — carne humana.\n\nMinha experiência\n\nEsse foi um daqueles livros que me prenderam do começo ao fim. A escrita do Raphael Montes é muito envolvente, e a cada capítulo eu ficava com mais vontade de continuar lendo para descobrir o que realmente estava acontecendo.\n\nConfesso que em vários momentos fiquei chocada e até desconfortável com algumas cenas, mas acho que isso faz parte da proposta do livro. Ele mexe com a nossa cabeça e faz a gente refletir até onde uma pessoa pode chegar quando está desesperada ou movida pela ambição.\n\nO que eu mais gostei foi que a história foge do óbvio. Sempre que eu achava que tinha entendido tudo, acontecia alguma coisa que mudava completamente o rumo da trama. Foi uma leitura intensa, cheia de suspense e com um final que me deixou pensando por um bom tempo depois de terminar.\n\nSe você gosta de livros que surpreendem, têm reviravoltas e não têm medo de explorar o lado mais sombrio do ser humano, eu recomendo muito Jantar Secreto. Só fica o aviso: não é uma leitura leve e definitivamente não é para estômagos sensíveis.\n\n“O grande trunfo da narrativa é mostrar como pessoas normais conseguem cruzar barreiras éticas inacreditáveis quando encontram uma justificativa conveniente.”\n\nPontos fortes\n• Escrita ágil e extremamente viciante\n• Reviravoltas marcantes\n• Ótima construção de tensão psicológica\n\nPontos de atenção\n• Violência explícita (gore) pode incomodar\n• Ações de alguns personagens beiram o absurdo\n• Não recomendado para estômago fraco\n\nVeredito final\n\nUma obra corajosa e visceral do suspense brasileiro contemporâneo: uma sátira ácida sobre ambição, ganância e os limites da moralidade humana. Leitura indispensável para quem quer um thriller intenso e chocante, de virar páginas sem parar.",
  "rating": 4.5,
  "tags": []
 },
 {
  "id": "izb-vacas-resenha",
  "bookId": "izb-vacas",
  "title": "",
  "text": "A premissa (sem spoilers)\n\nEm uma pequena cidade rural marcada pela pobreza e pelo isolamento, conhecemos uma menina sem nome que cresce cercada pelo silêncio da mãe e pela ausência do pai. Suas primeiras companheiras são as vacas do quintal, com as quais encontra uma forma de pertencimento antes mesmo de compreender o que significa ser humana.\n\nA chegada de novos vizinhos transforma sua maneira de enxergar o mundo. Aos poucos, a menina aprende a falar, descobre as palavras e começa a compreender sentimentos e situações que antes não conseguia nomear. Crescer, porém, também significa descobrir que o mundo dos adultos é repleto de contradições, perdas e violências.\n\nMinha experiência\n\nO que torna essa história tão particular é a maneira como a autora utiliza o olhar de uma criança para falar sobre questões profundas da existência humana. A narrativa mistura ingenuidade e lucidez, delicadeza e brutalidade, criando um contraste que pode provocar tanto sorrisos quanto um aperto no coração.\n\nA relação da protagonista com as vacas vai além da companhia: ela representa uma forma de existir antes das exigências, das regras e das dores que acompanham o processo de se tornar gente. Conforme a menina descobre as palavras, também passa a reconhecer as ausências, os afetos e as feridas que fazem parte de sua realidade.\n\nDora Freind constrói uma narrativa poética e simbólica, convidando o leitor a olhar para a infância não apenas como uma fase da vida, mas como um território onde identidade, linguagem e pertencimento começam a ganhar forma.\n\nÉ uma história que nos faz pensar em como aprendemos a existir a partir dos encontros que temos e de tudo aquilo que, mesmo sem perceber, levamos conosco enquanto crescemos.\n\n“Crescer também é descobrir que o mundo não é tão simples quanto parecia — e que algumas perguntas continuam conosco muito depois da infância.”\n\nPontos fortes\n• Perspectiva original e cheia de simbolismos\n• Escrita poética e reflexiva\n• Temas profundos sobre identidade e pertencimento\n\nPontos de atenção\n• Aborda violência, sofrimento e vulnerabilidade\n• Algumas passagens pedem leitura atenta e interpretativa\n• O contraste entre inocência e dureza pode ser emocionalmente intenso\n\nVeredito final\n\nAs vacas não me olham mais na cara é um romance que utiliza a delicadeza da infância para revelar verdades desconfortáveis sobre o mundo adulto. Com uma narrativa poética e uma protagonista singular, Dora Freind explora a fronteira entre o animal e o humano, o silêncio e a palavra, a inocência e a consciência.\n\nMais do que acompanhar o crescimento de uma menina, a obra nos convida a refletir sobre o que perdemos, descobrimos e carregamos quando aprendemos a ser gente. Uma leitura para quem aprecia histórias simbólicas, personagens incomuns e livros que deixam perguntas ecoando mesmo depois da última página.",
  "rating": 5.0,
  "tags": []
 },
 {
  "id": "izb-passaro-resenha",
  "bookId": "izb-passaro",
  "title": "",
  "text": "A premissa (sem spoilers)\n\nAcompanhamos a vida de uma mulher desde a infância até a vida adulta, atravessando experiências que vão moldando sua maneira de enxergar o mundo e a si mesma. Em uma narrativa fragmentada, construída em versos e com uma linguagem muito própria, o livro percorre momentos de afeto, descobertas, violências, perdas e silêncios.\n\nMais do que contar uma história linear, Aline Bei nos aproxima dos sentimentos e das marcas que certas experiências deixam ao longo de uma vida.\n\nMinha experiência\n\nFoi uma leitura que me deixou bastante reflexiva e, ao mesmo tempo, triste. É daqueles livros que fazem a gente parar por alguns instantes para absorver o que acabou de ler. A história carrega uma melancolia muito forte e apresenta dores que, mesmo sendo difíceis, fazem parte da experiência humana.\n\nA escrita da Aline Bei é diferente, delicada e impactante. A forma como os acontecimentos são apresentados faz com que a gente acompanhe não apenas os fatos, mas também o peso emocional que eles deixam. Algumas passagens permanecem na cabeça depois da leitura, justamente porque despertam pensamentos sobre o tempo, as relações, as perdas e tudo aquilo que carregamos sem perceber.\n\nNão foi uma leitura feliz ou confortável, mas foi uma leitura que senti profundamente. Terminei com o coração apertado e muitas coisas para pensar. Para mim, esse é o tipo de livro que não termina exatamente quando chegamos à última página.\n\n“Há histórias que não nos deixam felizes ao terminar; apenas nos fazem sentir e pensar um pouco mais profundamente.”\n\nPontos fortes\n• Escrita poética, sensível e original\n• Profundidade emocional e reflexões marcantes\n• Narrativa que permanece com o leitor\n\nPontos de atenção\n• Temas emocionalmente pesados e tristes\n• Aborda experiências dolorosas e situações de violência\n• A estrutura em versos pode exigir adaptação\n\nVeredito final\n\nO peso do pássaro morto foi uma leitura muito reflexiva, triste e intensa. Aline Bei escreve de um jeito que toca em lugares delicados, mostrando como as experiências da vida podem nos transformar e deixar marcas profundas. É um livro que provoca sentimentos, desconforto e muitas reflexões.\n\nMinha nota é 5,0/5,0. Não porque seja uma história fácil ou alegre, mas porque me marcou pela sensibilidade, pela escrita e pela forma como me fez pensar. Uma leitura dolorida, mas muito significativa.",
  "rating": 5.0,
  "tags": []
 },
 {
  "id": "izb-metamorfose-resenha",
  "bookId": "izb-metamorfose",
  "title": "",
  "text": "A premissa (sem spoilers)\n\nGregor Samsa acorda certa manhã transformado em um inseto monstruoso. A partir dessa transformação, acompanhamos não apenas o isolamento físico e emocional que ele passa a viver, mas também a maneira como sua família reage quando ele deixa de conseguir trabalhar e sustentar a casa.\n\nMinha experiência\n\nGregor se transforma em um inseto, mas, durante a leitura, me questionei se os verdadeiros insetos não seriam aqueles que o cercavam. Gregor continuava sentindo, pensando e se preocupando com sua família, porém, quando deixou de ser capaz de trabalhar e sustentar os outros, sua presença passou a ser vista como um incômodo.\n\nEnxerguei nessa história uma reflexão sobre pessoas que, ao envelhecer, adoecer ou perder sua autonomia, passam a ser tratadas como um peso. Gregor parece ter sido valorizado enquanto conseguia oferecer algo, e sua morte, em vez de representar uma tragédia para a família, acaba sendo recebida como um alívio.\n\nKafka nos faz questionar quanto do nosso valor é condicionado àquilo que podemos proporcionar aos outros e o quanto a humanidade pode se perder quando a conveniência se sobrepõe à empatia. Uma leitura incômoda, triste e profundamente reflexiva, que me deixou pensando em quem são, afinal, os verdadeiros monstros dessa história.\n\n“Quando alguém deixa de ser útil aos olhos dos outros, será que deixa também de merecer cuidado?”\n\nVeredito final\n\nA Metamorfose é uma leitura desconfortável e poderosa sobre rejeição, utilidade, dignidade e a fragilidade da empatia. A transformação de Gregor talvez seja apenas a forma mais visível de revelar a desumanização que já existia ao seu redor.\n\nMinha nota é 5,0/5,0. Uma obra que, apesar de triste, provoca questionamentos difíceis e continua ecoando depois que terminamos de ler.",
  "rating": 5.0,
  "tags": []
 }
];

export async function applySeed() {
  if (await db.getSetting(SEED_KEY, false)) return 0;
  const existing = (await db.all('books')).filter(b => !b.isDemo);
  const have = new Set(existing.map(b => norm(b.title)));
  const today = todayISO();
  const books = BOOKS.filter(b => !have.has(norm(b.title))).map(b => ({ ...b, addedAt: today, progressLog: [{ date: today, page: b.pages || 0, note: 'Importado do meu diário' }] }));
  const ids = new Set(books.map(b => b.id));
  const reviews = REVIEWS.filter(r => ids.has(r.bookId)).map(r => ({ ...r, date: today }));
  if (books.length) await db.putMany('books', books.map(b => ({ ...b, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })));
  if (reviews.length) await db.putMany('reviews', reviews.map(r => ({ ...r, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })));
  await db.setSetting(SEED_KEY, true);
  return books.length;
}
