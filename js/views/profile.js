import * as db from '../db.js';
import { html, raw, icon, icons, readFileAsDataURL, resizeImage, sha256, $ } from '../utils.js';
import { pageHeader, toast, confirmDialog, promptDialog, openSheet } from '../ui.js';
import { applyTheme, canInstall, promptInstall, isStandalone } from '../app.js';
import { backupJSON, exportCSV, exportPart, readBackupFile, restore, lastBackupLabel } from '../backup.js';
import { getGoal } from '../model.js';

export async function render({ root, refresh, go }) {
  const [name, photo, theme, pin, lastBackup, defaultGoal] = await Promise.all([
    db.getSetting('name', ''), db.getSetting('photo', ''), db.getSetting('theme', 'auto'), db.getSetting('pinHash', null),
    db.getSetting('lastBackup', null), db.getSetting('defaultGoal', 12),
  ]);
  const year = new Date().getFullYear();
  const homeArt = await db.getSetting('homeArt', 'default');
  const goal = await getGoal(year);
  const books = await db.all('books');
  const hasDemo = (await Promise.all(['books', 'reviews', 'entries', 'quotes'].map(s => db.all(s)))).some(l => l.some(i => i.isDemo));
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.(); } catch (e) { /* ok */ }
  let usage = '';
  try { const est = await navigator.storage?.estimate?.(); if (est?.usage) usage = (est.usage / 1048576).toFixed(1).replace('.', ',') + ' MB'; } catch (e) { /* ok */ }

  root.innerHTML = String(html`
    ${pageHeader({ title: 'Perfil', back: true })}
    <div class="profile-head">
      <svg class="flora" viewBox="0 0 240 320" aria-hidden="true"><use href="#floral-sprig"/></svg>
      <label class="profile-photo" aria-label="Alterar foto">
        ${photo ? html`<img src="${photo}" alt="Foto de perfil">` : icon('user')}
        <span class="cam">${icon('camera')}</span>
        <input type="file" accept="image/*" data-photo hidden>
      </label>
      <h2 class="serif" style="font-size:28px">${name || 'Leitora'}</h2>
      ${photo ? html`<button class="link-btn" data-rmphoto>remover foto</button>` : ''}
    </div>

    <div class="settings-group">
      <h3>Sobre mim</h3>
      <div class="card-flat">
        <button class="setting-row" data-name>${icon('user')}<span class="lbl">Nome<small>Usado na saudação e na retrospectiva</small></span><span class="val">${name || 'definir'}</span></button>
        <button class="setting-row" data-goal>${icon('flame')}<span class="lbl">Meta de ${year}</span><span class="val">${goal} livros</span></button>
        <button class="setting-row" data-defgoal>${icon('calendar')}<span class="lbl">Meta padrão para novos anos</span><span class="val">${defaultGoal}</span></button>
      </div>
    </div>

    <div class="settings-group">
      <h3>Aparência</h3>
      <div class="card-flat" style="padding:14px 16px">
        <div class="seg" role="radiogroup" aria-label="Tema">
          ${[['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Automático']].map(([k, l]) => html`<button class="${theme === k ? 'active' : ''}" data-theme="${k}">${l}</button>`)}
        </div>
        <p class="field-label" style="margin:18px 0 8px">Imagem da tela inicial</p>
        <div class="seg" role="radiogroup" aria-label="Imagem da tela inicial">
          ${[['default', 'Desenho'], ['photo', 'Minha foto'], ['none', 'Nenhuma']].map(([k, l]) => html`<button class="${homeArt === k ? 'active' : ''}" data-homeart="${k}">${l}</button>`)}
        </div>
        ${homeArt === 'photo' ? html`<label class="btn btn-ghost btn-sm" style="margin-top:12px">${icon('image')} Trocar foto<input type="file" accept="image/*" data-homephoto hidden></label>` : ''}
        <input type="file" accept="image/*" data-homephoto-new hidden>
      </div>
    </div>

    <div class="settings-group">
      <h3>Privacidade</h3>
      <div class="card-flat">
        <button class="setting-row" data-pin>${icon('lock')}<span class="lbl">Bloqueio por PIN<small>Pede um código ao abrir o app neste aparelho</small></span><span class="val">${pin ? 'ativado' : 'desativado'}</span></button>
        <div class="setting-row" style="cursor:default">${icon('leaf')}<span class="lbl">Seus dados ficam só neste aparelho<small>Nada é enviado a servidores. A busca de livros envia apenas o termo pesquisado.${usage ? ` Espaço usado: ${usage}.` : ''}</small></span></div>
        <div class="setting-row" style="cursor:default">${icon('check')}<span class="lbl">Armazenamento persistente<small>${persisted ? 'Concedido: o navegador não apagará seus dados automaticamente.' : 'Não concedido pelo navegador. Instale o app e faça backups regulares.'}</small></span></div>
      </div>
    </div>

    <div class="settings-group">
      <h3>Backup e exportação</h3>
      <div class="card-flat">
        <button class="setting-row" data-backup>${icon('download')}<span class="lbl">Fazer backup completo<small>${lastBackupLabel(lastBackup)} · arquivo JSON</small></span></button>
        <label class="setting-row" style="cursor:pointer">${icon('upload')}<span class="lbl">Restaurar backup<small>A partir de um arquivo JSON</small></span><input type="file" accept="application/json,.json" data-restore hidden></label>
        <button class="setting-row" data-export>${icon('file')}<span class="lbl">Exportar dados<small>Biblioteca, resenhas, citações, diário e estatísticas · JSON, CSV ou PDF</small></span>${icon('chevronR')}</button>
      </div>
    </div>

    <div class="settings-group">
      <h3>Aplicativo</h3>
      <div class="card-flat">
        ${!isStandalone() ? html`<button class="setting-row" data-install>${icon('arrowUp')}<span class="lbl">Instalar na tela inicial<small>Use como um aplicativo, inclusive offline</small></span></button>` : ''}
        ${hasDemo ? html`<button class="setting-row" data-rmdemo>${icon('wand')}<span class="lbl">Remover dados de demonstração</span></button>`
          : !books.length ? html`<button class="setting-row" data-demo>${icon('wand')}<span class="lbl">Carregar dados de demonstração<small>Para explorar o app; podem ser removidos depois</small></span></button>` : ''}
        <button class="setting-row danger" data-wipe>${icon('trash')}<span class="lbl">Apagar todos os dados</span></button>
      </div>
    </div>
    <p class="center muted small" style="margin-top:30px;font-family:var(--f-display);font-style:italic;font-size:16px">Nas Entrelinhas<br>Entre histórias, pensamentos e tudo aquilo que permanece.</p>
  `);

  $('[data-photo]', root).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { await db.setSetting('photo', await resizeImage(await readFileAsDataURL(f), 320, 320, 0.85)); toast('Foto atualizada'); refresh(); }
    catch (err) { toast('Não foi possível usar esta imagem.', 'error'); }
  });
  root.querySelectorAll('[data-homephoto], [data-homephoto-new]').forEach(inp => inp.addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      await db.setSetting('homeArtPhoto', await resizeImage(await readFileAsDataURL(f), 1000, 1000, 0.85));
      await db.setSetting('homeArt', 'photo'); toast('Foto da tela inicial salva'); refresh();
    } catch (err) { toast('Não foi possível usar esta imagem.', 'error'); }
  }));
  $('[data-restore]', root).addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let parsed;
    try { parsed = await readBackupFile(f); } catch (err) { toast(err.message, 'error'); return; }
    const s = parsed.summary;
    const { el, close } = openSheet(String(html`
      <p class="muted">Backup ${s.exportedAt ? `de ${new Date(s.exportedAt).toLocaleDateString('pt-BR')}` : ''} com <b>${s.books}</b> livros, <b>${s.reviews}</b> resenhas, <b>${s.entries}</b> pensamentos e <b>${s.quotes}</b> fragmentos.</p>
      <div class="option-list" style="margin-top:10px">
        <button data-mode="merge">${icon('plus')}<span style="flex:1">Mesclar com os dados atuais<br><small class="muted">Registros com o mesmo identificador serão atualizados</small></span></button>
        <button data-mode="replace" class="danger">${icon('upload')}<span style="flex:1">Substituir tudo<br><small class="muted">Os dados atuais deste aparelho serão apagados</small></span></button>
      </div>`), { title: 'Restaurar backup' });
    el.onclick = async ev => {
      const b = ev.target.closest('[data-mode]'); if (!b) return;
      close();
      if (b.dataset.mode === 'replace' && !(await confirmDialog({ title: 'Substituir todos os dados?', message: 'Tudo o que está neste aparelho será trocado pelo conteúdo do backup.', confirm: 'Substituir' }))) return;
      try {
        await restore(parsed.data, b.dataset.mode);
        applyTheme(await db.getSetting('theme', 'auto'));
        toast('Backup restaurado'); go('#/', { replace: true });
      } catch (err) { console.error(err); toast('Falha ao restaurar: ' + err.message, 'error'); }
    };
  });

  root.onclick = async e => {
    const t = e.target.closest('[data-theme]');
    if (t) { await db.setSetting('theme', t.dataset.theme); applyTheme(t.dataset.theme); refresh(); return; }
    const ha = e.target.closest('[data-homeart]');
    if (ha) {
      if (ha.dataset.homeart === 'photo' && !(await db.getSetting('homeArtPhoto', ''))) { $('[data-homephoto-new]', root).click(); return; }
      await db.setSetting('homeArt', ha.dataset.homeart); toast('Imagem da tela inicial atualizada'); refresh(); return;
    }
    if (e.target.closest('[data-rmphoto]')) { await db.setSetting('photo', ''); refresh(); return; }
    if (e.target.closest('[data-name]')) {
      const v = await promptDialog({ title: 'Como devo te chamar?', label: 'Nome', value: name });
      if (v !== null) { await db.setSetting('name', v.trim()); toast('Nome salvo'); refresh(); } return;
    }
    if (e.target.closest('[data-goal]') || e.target.closest('[data-defgoal]')) {
      const isDef = !!e.target.closest('[data-defgoal]');
      const v = await promptDialog({ title: isDef ? 'Meta padrão' : `Meta de ${year}`, label: 'Número de livros', type: 'number', value: isDef ? defaultGoal : goal, min: 1 });
      if (v === null) return;
      const n = parseInt(v, 10);
      if (!n || n < 1 || n > 1000) { toast('Informe um número entre 1 e 1000.', 'error'); return; }
      if (isDef) await db.setSetting('defaultGoal', n);
      else { const goals = await db.getSetting('goals', {}); goals[year] = n; await db.setSetting('goals', goals); }
      toast('Meta atualizada'); refresh(); return;
    }
    if (e.target.closest('[data-pin]')) {
      if (pin) {
        if (await confirmDialog({ title: 'Desativar o PIN?', message: 'O app abrirá sem pedir código.', confirm: 'Desativar', danger: false })) { await db.setSetting('pinHash', null); toast('PIN desativado'); refresh(); }
        return;
      }
      const v = await promptDialog({ title: 'Criar PIN', label: 'De 4 a 12 dígitos', type: 'password', hint: 'Se esquecer o PIN, será preciso limpar os dados do site — mantenha um backup.' });
      if (v === null) return;
      if (!/^\d{4,12}$/.test(v)) { toast('Use de 4 a 12 números.', 'error'); return; }
      const v2 = await promptDialog({ title: 'Confirme o PIN', label: 'Digite novamente', type: 'password' });
      if (v2 !== v) { toast('Os PINs não conferem.', 'error'); return; }
      const h = await sha256('ne:' + v);
      await db.setSetting('pinHash', h);
      try { sessionStorage.setItem('ne-unlocked', h); } catch (err) { /* ok */ }
      toast('PIN ativado'); refresh(); return;
    }
    if (e.target.closest('[data-backup]')) { await backupJSON(); toast('Backup gerado. Guarde o arquivo em um lugar seguro.'); refresh(); return; }
    if (e.target.closest('[data-export]')) { exportMenu(go); return; }
    if (e.target.closest('[data-install]')) {
      if (canInstall()) { if (await promptInstall()) toast('App instalado'); return; }
      openSheet(String(html`<div class="prose" style="line-height:1.7">
        <p><b>iPhone / iPad (Safari):</b> toque em <b>Compartilhar</b> ${raw(`<span class="ic" style="width:16px;height:16px;vertical-align:-3px">${icons.share}</span>`)} e depois em <b>Adicionar à Tela de Início</b>.</p>
        <p style="margin-top:12px"><b>Android (Chrome):</b> abra o menu ⋮ e toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>
        <p style="margin-top:12px"><b>Computador (Chrome/Edge):</b> clique no ícone de instalação na barra de endereço.</p></div>`), { title: 'Instalar o app' });
      return;
    }
    if (e.target.closest('[data-demo]')) { const { loadDemo } = await import('../demo.js'); await loadDemo(); go('#/'); return; }
    if (e.target.closest('[data-rmdemo]')) { const { removeDemo } = await import('../demo.js'); if (await removeDemo()) refresh(); return; }
    if (e.target.closest('[data-wipe]')) {
      if (!(await confirmDialog({ title: 'Apagar todos os dados?', message: 'Livros, resenhas, pensamentos, fragmentos e configurações serão apagados deste aparelho. Faça um backup antes, se quiser guardá-los.', confirm: 'Apagar tudo' }))) return;
      const v = await promptDialog({ title: 'Confirmação final', label: 'Digite APAGAR para confirmar' });
      if ((v || '').trim().toUpperCase() !== 'APAGAR') { toast('Nada foi apagado.'); return; }
      for (const s of db.STORES) await db.clear(s);
      applyTheme('auto'); toast('Todos os dados foram apagados'); go('#/', { replace: true });
    }
  };
}

function exportMenu(go) {
  const kinds = [['books', 'Biblioteca (livros)'], ['reviews', 'Resenhas'], ['quotes', 'Citações (fragmentos)'], ['entries', 'Diário (pensamentos)']];
  const { el, close } = openSheet(String(html`
    ${kinds.map(([k, l]) => html`<div class="setting-row" style="gap:8px;flex-wrap:wrap"><span class="lbl" style="min-width:140px">${l}</span>
      <button class="btn btn-ghost btn-sm" data-json="${k}">JSON</button><button class="btn btn-ghost btn-sm" data-csv="${k}">CSV</button><button class="btn btn-ghost btn-sm" data-pdf="${k}">PDF</button></div>`)}
    <div class="setting-row" style="gap:8px;flex-wrap:wrap"><span class="lbl" style="min-width:140px">Estatísticas</span><button class="btn btn-ghost btn-sm" data-csv="stats">CSV</button><button class="btn btn-ghost btn-sm" data-pdf="stats">PDF</button></div>
    <p class="hint" style="margin-top:12px">O PDF abre a janela de impressão: escolha “Salvar como PDF”. Para preservar tudo e poder restaurar depois, use o backup completo.</p>`), { title: 'Exportar dados' });
  el.onclick = async e => {
    const j = e.target.closest('[data-json]'), c = e.target.closest('[data-csv]'), p = e.target.closest('[data-pdf]');
    try {
      if (j) { await exportPart(j.dataset.json); toast('Arquivo exportado'); }
      if (c) { await exportCSV(c.dataset.csv); toast('Arquivo exportado'); }
      if (p) { close(); go(`#/imprimir/${p.dataset.pdf}`); }
    } catch (err) { console.error(err); toast('Não foi possível exportar.', 'error'); }
  };
}
