# Nas Entrelinhas
*Entre histórias, pensamentos e tudo aquilo que permanece.*

Diário literário pessoal em forma de PWA: pensado primeiro para o celular, instalável na tela inicial e com funcionamento offline.

## Como usar
O app é estático (HTML, CSS e JavaScript puro, sem etapa de build). Ele precisa ser servido por **HTTPS** para ser instalado e funcionar offline:

- **GitHub Pages**: envie esta pasta para um repositório e ative Settings → Pages.
- **Netlify / Cloudflare Pages**: arraste a pasta para o painel de deploy.
- **Local**: `python3 -m http.server 8080` e abra `http://localhost:8080`.

Instalação no celular: no iPhone, abra no Safari → Compartilhar → *Adicionar à Tela de Início*. No Android, abra no Chrome → menu ⋮ → *Instalar app*.

## Arquitetura
- `js/db.js`: IndexedDB (livros, resenhas, pensamentos, fragmentos, configurações). Os dados ficam **somente no aparelho**, e o app pede ao navegador armazenamento persistente.
- `js/app.js`: roteador por hash, tema claro/escuro/automático e bloqueio opcional por PIN.
- `js/views/*`: uma tela por arquivo.
- `js/writer.js`: editor livre com salvamento automático (resenhas e diário).
- `js/search.js`: busca no Google Books e na Open Library (envia apenas o termo pesquisado).
- `js/share.js`: cartões de citação e retrospectiva gerados em canvas (PNG).
- `js/backup.js`: backup e restauração em JSON e exportação em CSV. O PDF é gerado pela impressão do navegador.
- `sw.js`: cache offline do app, das fontes e das capas.

## Privacidade e backup
Não há servidor nem conta, e nada é publicado. Como os dados vivem no navegador do aparelho, **faça backups periódicos** (Perfil → Fazer backup completo). Use o mesmo arquivo para levar seus dados a outro aparelho (Perfil → Restaurar backup → Mesclar).

Ao alterar arquivos do app, aumente `VERSION` em `sw.js` para que os aparelhos instalados recebam a atualização.
