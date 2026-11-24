// Gráficos minimalistas em SVG
import { esc, MONTHS_SHORT, raw } from './utils.js';

export function monthBars(values, { alt = false, unit = '' } = {}) {
  const W = 340, H = 150, padB = 20, padT = 16;
  const max = Math.max(1, ...values);
  const bw = W / 12;
  const barW = Math.min(16, bw * 0.5);
  const scale = v => (v / max) * (H - padB - padT);
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico por mês">`;
  [0.5, 1].forEach(f => { const y = H - padB - (H - padB - padT) * f; out += `<line class="grid" x1="0" x2="${W}" y1="${y}" y2="${y}"/>`; });
  values.forEach((v, i) => {
    const h = v ? Math.max(3, scale(v)) : 0;
    const x = i * bw + (bw - barW) / 2;
    const y = H - padB - h;
    if (v) {
      out += `<rect class="bar ${alt ? 'alt' : ''}" x="${x}" y="${y}" width="${barW}" height="${h}" rx="${barW / 2 > 4 ? 4 : barW / 2}"><title>${MONTHS_SHORT[i]}: ${v}${unit}</title></rect>`;
      out += `<text class="val" x="${x + barW / 2}" y="${y - 4}" text-anchor="middle">${v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : v}</text>`;
    } else {
      out += `<circle cx="${x + barW / 2}" cy="${H - padB - 2}" r="1.5" fill="currentColor" opacity=".25"/>`;
    }
    out += `<text x="${x + barW / 2}" y="${H - 4}" text-anchor="middle">${MONTHS_SHORT[i][0].toUpperCase()}</text>`;
  });
  return raw(`<div class="chart">${out}</svg></div>`);
}

export function hbars(entries, { limit = 6, tone } = {}) {
  if (!entries.length) return raw('<p class="muted small">Sem dados suficientes ainda.</p>');
  const max = Math.max(...entries.map(e => e[1]));
  return raw(`<div class="hbars">${entries.slice(0, limit).map(([k, v]) => `
    <div class="hbar"><span class="lbl" title="${esc(k)}">${esc(k)}</span><span class="track"><span style="width:${(v / max) * 100}%;${tone ? `--tone:${tone(k)}` : ''}"></span></span><span class="n">${v}</span></div>`).join('')}</div>`);
}

export function ratingBars(dist) {
  const max = Math.max(1, ...dist);
  const W = 340, H = 110, bw = W / 5, barW = 34;
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribuição de notas">`;
  dist.forEach((v, i) => {
    const h = v ? Math.max(3, (v / max) * (H - 38)) : 0;
    const x = i * bw + (bw - barW) / 2, y = H - 20 - h;
    if (v) out += `<rect class="bar alt" x="${x}" y="${y}" width="${barW}" height="${h}" rx="4"/><text class="val" x="${x + barW / 2}" y="${y - 5}" text-anchor="middle">${v}</text>`;
    else out += `<line class="grid" x1="${x}" x2="${x + barW}" y1="${H - 21}" y2="${H - 21}"/>`;
    out += `<text x="${x + barW / 2}" y="${H - 4}" text-anchor="middle">${i + 1} ★</text>`;
  });
  return raw(`<div class="chart">${out}</svg></div>`);
}
