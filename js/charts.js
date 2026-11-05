// Gráficos SVG ligeros. Cada elemento muestra su importe exacto al tocarlo o enfocarlo,
// y todos incluyen una tabla con los valores.
import { esc, money } from './ui.js';
import { tr } from './i18n.js';

export const PALETTE = ['#8b7cf6', '#5aa9f5', '#3cc4a0', '#f28bb6', '#f2a65a', '#7c8cf8', '#60c3d8', '#c084fc', '#94a3b8'];
const tipAttr = (text) => `data-tip="${esc(text)}" tabindex="0" role="img" aria-label="${esc(text)}"`;

export function donut(items, { size = 180, label = '', sub = '' } = {}) {
  const total = items.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (!total) return '';
  const r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = items.map((x, i) => {
    const len = (Math.max(0, x.value) / total) * c;
    const gap = items.length > 1 ? Math.min(3, len / 3) : 0;
    const el = `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${esc(x.color || PALETTE[i % PALETTE.length])}" stroke-width="22" stroke-linecap="butt"
      stroke-dasharray="${Math.max(0, len - gap)} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 90 90)"
      ${tipAttr(`${tr(x.name)}: ${money(x.value)} (${Math.round((x.value / total) * 100)} %)`)}/>`;
    offset += len;
    return el;
  }).join('');
  return `<div class="chart" style="max-width:${size}px;margin:auto"><svg viewBox="0 0 180 180">
    <circle cx="90" cy="90" r="${r}" fill="none" stroke="rgba(140,140,190,.12)" stroke-width="22"/>${arcs}
    <text x="90" y="86" text-anchor="middle" font-size="17" font-weight="650" fill="currentColor">${esc(label)}</text>
    <text x="90" y="106" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">${esc(sub)}</text></svg></div>`;
}

// Barras agrupadas: groups = [{label, bars:[{name, value, color}]}]
export function bars(groups, { height = 200 } = {}) {
  const max = Math.max(1, ...groups.flatMap((g) => g.bars.map((b) => b.value)));
  const W = 600, H = height, pad = 26, n = groups.length;
  const gw = (W - 10) / Math.max(1, n);
  const per = groups[0]?.bars.length || 1;
  const bw = Math.min(26, (gw - 10) / per);
  const ticks = [0, .5, 1].map((t) => `<line x1="0" x2="${W}" y1="${H - pad - t * (H - pad - 10)}" y2="${H - pad - t * (H - pad - 10)}" stroke="currentColor" opacity=".08"/>
    <text x="${W}" y="${H - pad - t * (H - pad - 10) - 4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".45">${esc(money(Math.round(max * t), { compact: true }))}</text>`).join('');
  const body = groups.map((g, i) => {
    const x0 = 5 + i * gw + (gw - bw * per - 4 * (per - 1)) / 2;
    const rects = g.bars.map((b, j) => {
      const h = Math.max(b.value > 0 ? 3 : 0, (b.value / max) * (H - pad - 10));
      return `<rect x="${x0 + j * (bw + 4)}" y="${H - pad - h}" width="${bw}" height="${h}" rx="${Math.min(7, bw / 2)}" fill="${esc(b.color)}" ${tipAttr(`${tr(g.label)} · ${tr(b.name)}: ${money(b.value)}`)}/>`;
    }).join('');
    return rects + `<text x="${5 + i * gw + gw / 2}" y="${H - 6}" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".6">${esc(g.label)}</text>`;
  }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${ticks}${body}</svg></div>`;
}

// Línea con área: points = [{label, value}]
export function line(points, { height = 190, color = '#8b7cf6', name = 'Saldo' } = {}) {
  if (!points.length) return '';
  const W = 600, H = height, pad = 24;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 100; max += 100; }
  const x = (i) => (points.length === 1 ? W / 2 : 12 + (i * (W - 24)) / (points.length - 1));
  const y = (v) => 10 + (1 - (v - min) / (max - min)) * (H - pad - 20);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const step = Math.ceil(points.length / 8);
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
    <defs><linearGradient id="lg-${color.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#lg-${color.slice(1)})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="6" fill="#fff" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" ${tipAttr(`${p.label} · ${tr(name)}: ${money(p.value)}`)}/>`).join('')}
    ${points.map((p, i) => (i % step === 0 ? `<text x="${x(i)}" y="${H - 5}" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".55">${esc(p.short || p.label)}</text>` : '')).join('')}
  </svg></div>`;
}

export const legend = (items) => `<div class="legend">${items.map((x) => `<span><i style="background:${esc(x.color)}"></i>${esc(x.name)}</span>`).join('')}</div>`;

export function table(headers, rows) {
  return `<details class="more no-print-toggle"><summary>Ver importes exactos</summary><div class="table-wrap"><table class="data-table">
    <thead><tr>${headers.map((h, i) => `<th class="${i ? 'n' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}

// Activa los globos de información en un contenedor (toque, ratón y teclado).
export function enableTips(root) {
  const show = (target) => {
    const chart = target.closest('.chart');
    if (!chart) return;
    chart.querySelector('.tip')?.remove();
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.textContent = target.getAttribute('data-tip');
    const cr = chart.getBoundingClientRect(), tr = target.getBoundingClientRect();
    tip.style.left = Math.min(cr.width - 60, Math.max(60, tr.left - cr.left + tr.width / 2)) + 'px';
    tip.style.top = (tr.top - cr.top) + 'px';
    chart.appendChild(tip);
  };
  const hide = (e) => e.target.closest?.('.chart')?.querySelector('.tip')?.remove();
  root.addEventListener('pointerover', (e) => { if (e.target.matches?.('[data-tip]')) show(e.target); });
  root.addEventListener('pointerout', (e) => { if (e.target.matches?.('[data-tip]')) hide(e); });
  root.addEventListener('click', (e) => { if (e.target.matches?.('[data-tip]')) show(e.target); });
  root.addEventListener('focusin', (e) => { if (e.target.matches?.('[data-tip]')) show(e.target); });
  root.addEventListener('focusout', (e) => { if (e.target.matches?.('[data-tip]')) hide(e); });
}
