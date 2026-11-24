// Gera imagens elegantes (citações e retrospectiva) em canvas
import { download } from './utils.js';
import { toast } from './ui.js';

export const CARD_STYLES = {
  creme: { bg: '#FBEFF3', fg: '#4A2E3B', accent: '#B5527F', sub: '#957A86', label: 'Rosa claro' },
  papel: { bg: '#FFFCFB', fg: '#4A2E3B', accent: '#7E9A74', sub: '#957A86', label: 'Papel', lines: true },
  oliva: { bg: '#7E9A74', fg: '#FFFCFB', accent: '#F5DCE9', sub: '#E2ECDF', label: 'Sálvia' },
  cafe: { bg: '#7A2748', fg: '#FBEFF3', accent: '#EFB4BE', sub: '#F5DCE9', label: 'Vinho' },
  terracota: { bg: '#B5527F', fg: '#FFFCFB', accent: '#7A2748', sub: '#FBEFF3', label: 'Rosa' },
};

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('italic 500 60px "Cormorant Garamond"'),
      document.fonts.load('500 60px "Cormorant Garamond"'),
      document.fonts.load('400 30px "DM Sans"'),
    ]);
  } catch (e) { /* usa fontes do sistema */ }
}

function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    lines.push(line);
  }
  return lines;
}

export async function quoteImage({ text, author, book, page }, styleKey = 'creme', format = 'square') {
  await ensureFonts();
  const s = CARD_STYLES[styleKey] || CARD_STYLES.creme;
  const W = 1080, H = format === 'story' ? 1920 : 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H);
  if (s.lines) { ctx.strokeStyle = 'rgba(181,82,127,.09)'; ctx.lineWidth = 2; for (let y = 120; y < H; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
  // moldura fina
  ctx.strokeStyle = s.sub; ctx.globalAlpha = .35; ctx.lineWidth = 2; ctx.strokeRect(48, 48, W - 96, H - 96); ctx.globalAlpha = 1;

  const pad = 130, maxW = W - pad * 2;
  let size = 66;
  const len = text.length;
  if (len > 140) size = 56; if (len > 260) size = 48; if (len > 420) size = 40; if (len > 650) size = 34;
  let lines;
  const maxTextH = H - 560;
  while (true) {
    ctx.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
    lines = wrap(ctx, text, maxW);
    if (lines.length * size * 1.32 <= maxTextH || size <= 26) break;
    size -= 2;
  }
  const lh = size * 1.32;
  const blockH = lines.length * lh;
  let y = (H - blockH) / 2 - 20;

  // aspas
  ctx.fillStyle = s.accent; ctx.font = `500 200px "Cormorant Garamond", Georgia, serif`; ctx.textAlign = 'center';
  ctx.fillText('“', W / 2, y - 20);

  ctx.fillStyle = s.fg; ctx.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * lh + size));

  y += blockH + 80;
  ctx.strokeStyle = s.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 40, y); ctx.lineTo(W / 2 + 40, y); ctx.stroke();
  ctx.fillStyle = s.fg; ctx.font = `500 30px "DM Sans", system-ui, sans-serif`;
  if (author) { ctx.letterSpacing = '4px'; ctx.fillText(author.toUpperCase(), W / 2, y + 60); }
  ctx.letterSpacing = '0px';
  ctx.fillStyle = s.sub; ctx.font = `italic 400 38px "Cormorant Garamond", Georgia, serif`;
  const ref = [book, page ? `p. ${page}` : ''].filter(Boolean).join(', ');
  if (ref) wrap(ctx, ref, maxW).slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, y + (author ? 115 : 60) + i * 46));

  ctx.fillStyle = s.sub; ctx.globalAlpha = .75; ctx.font = `400 22px "DM Sans", system-ui, sans-serif`; ctx.letterSpacing = '6px';
  ctx.fillText('NAS ENTRELINHAS', W / 2, H - 92); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
  return c;
}

export function canvasToBlob(c) { return new Promise(res => c.toBlob(res, 'image/png')); }

export async function shareOrDownload(canvas, filename, title = 'Nas Entrelinhas') {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  download(filename, blob);
  toast('Imagem salva nos downloads');
  return 'downloaded';
}
