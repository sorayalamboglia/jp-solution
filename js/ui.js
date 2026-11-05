// Utilidades de interfaz: iconos, formato, hojas modales, avisos y confirmaciones.
import { locale, L } from './i18n.js';
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9 15 2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 20 4M17 4h3v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  swap: '<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  cart: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r="1"/><circle cx="16.5" cy="13" r="1"/>',
  heart: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="M12 9v6M9 12h6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v2.5M12 2.5v2.5"/>',
  shirt: '<path d="m8 3-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8S10.5 3 8 3.5 7.5 8 12 8zM12 8s1.5-5 4-4.5S16.5 8 12 8z"/>',
  dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3 12.5h18"/>',
  store: '<path d="M4 10v10h16V10"/><path d="M3 4h18l-1.5 6h-15z"/><path d="M10 20v-5h4v5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9a2.6 2.6 0 0 0-2.8-1.6c-1.6 0-2.7.9-2.7 2.1 0 2.9 5.6 1.4 5.6 4.4 0 1.3-1.2 2.2-2.9 2.2a3 3 0 0 1-2.9-1.7M12 6v1.4M12 16.6V18"/>',
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5"/><path d="M16 13.5h2"/>',
  bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  piggy: '<path d="M19 9.5c1 .2 2 1 2 2.5M5.5 9A6.8 6.8 0 0 1 12 5.5c3.9 0 7 2.6 7 6 0 1.8-.9 3.4-2.3 4.5V19h-2.5l-.6-1.6a8 8 0 0 1-3.2 0L9.8 19H7.3v-2.6A5.6 5.6 0 0 1 5 13H3v-3h2.5z"/><circle cx="15.5" cy="10.5" r=".8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5z"/><path d="M10 21h4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  filter: '<path d="M3.5 5h17l-6.5 8v5.5l-4 2V13z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  chevdown: '<path d="m6 9 6 6 6-6"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5a4.5 4.5 0 0 1 4.5 4.5"/>',
  family: '<circle cx="12" cy="7" r="3.2"/><circle cx="5.5" cy="9" r="2.3"/><circle cx="18.5" cy="9" r="2.3"/><path d="M6.5 20a5.5 5.5 0 0 1 11 0zM1.5 19a4 4 0 0 1 5.5-3.7M22.5 19a4 4 0 0 0-5.5-3.7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 8 .5 4.5-5c1-1 2.5-1.3 3.2-.7.6.7.3 2.2-.7 3.2l-5 4.5.5 8L13.5 21l-2.5-7.5-3.5 3V19l-1.5 1.5-1.5-3-3-1.5L3 14.5h2.5z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.5"/>',
  clip: '<path d="m20 11.5-8.2 8.2a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.8 17a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  house: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
  umbrella: '<path d="M2 12a10 10 0 0 1 20 0z"/><path d="M12 12v7a2 2 0 0 0 4 0"/>',
  debt: '<path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/><path d="m17 3 3 3-3 3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
export const ICONS = Object.keys(P);
export const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.tag}</svg>`;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- Dinero ----------
let currency = 'USD';
export const setCurrency = (c) => { currency = c || 'USD'; };
export function money(cents, { sign = false, compact = false } = {}) {
  const v = (cents || 0) / 100;
  const f = new Intl.NumberFormat(locale(), { style: 'currency', currency, minimumFractionDigits: compact && Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  const s = f.format(Math.abs(v));
  if (cents < 0) return '−' + s;
  return sign && cents > 0 ? '+' + s : s;
}
export const currencySymbol = () => {
  const parts = new Intl.NumberFormat(locale(), { style: 'currency', currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value || '$';
};
// Convierte lo que escribe la persona a centavos exactos, sin errores de coma flotante.
export function parseMoney(input) {
  let s = String(input ?? '').trim().replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  let ip = s, dp = '';
  if (last >= 0 && s.length - last - 1 <= 2 && s.length - last - 1 > 0) { ip = s.slice(0, last); dp = s.slice(last + 1); }
  else if (last === s.length - 1) { ip = s.slice(0, last); }
  ip = ip.replace(/[.,]/g, '');
  if (!/^\d*$/.test(ip) || !/^\d*$/.test(dp)) return NaN;
  return Number(ip || '0') * 100 + Number((dp + '00').slice(0, 2));
}
export const centsToInput = (c) => (c == null ? '' : (c / 100).toFixed(2));

// ---------- Fechas ----------
const D = (s) => new Date(s + 'T12:00:00');
export const fmtDate = (s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (s ? D(s).toLocaleDateString(locale(), opts) : '');
export const fmtDay = (s) => cap(D(s).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtMonth = (ym) => cap(D(ym + '-01').toLocaleDateString(locale(), { month: 'long', year: 'numeric' }));
export const fmtShortMonth = (ym) => D(ym + '-01').toLocaleDateString(locale(), { month: 'short' });
export function addDays(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function addMonths(ym, n) { const [y, m] = ym.split('-').map(Number); const t = y * 12 + m - 1 + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; }
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export function relDay(s, today) {
  const d = daysBetween(today, s);
  if (d === 0) return L('Hoy', 'Today');
  if (d === 1) return L('Mañana', 'Tomorrow');
  if (d === -1) return L('Ayer', 'Yesterday');
  if (d > 1 && d < 7) return L(`En ${d} días`, `In ${d} days`);
  if (d < -1 && d > -31) return L(`Hace ${-d} días`, `${-d} days ago`);
  return fmtDate(s, { day: 'numeric', month: 'short' });
}

// ---------- Componentes pequeños ----------
export const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
export const avatar = (m, lg = false) => `<span class="avatar ${lg ? 'lg' : ''}" style="background:${esc(m?.color || '#a1a1b5')}" title="${esc(m?.name || 'Exintegrante')}">${esc(initials(m?.name || '?'))}</span>`;
export const catIcon = (c, size = '') => `<span class="cat-icon ${size}" style="color:${esc(c?.color || '#8b7cf6')}">${icon(c?.icon || 'tag')}</span>`;
export function progress(pct, cls = '') {
  const p = Math.max(0, Math.min(100, pct || 0));
  return `<div class="progress ${cls}" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div>`;
}
export const hint = (text) => `<div class="hint">${icon('info')} ${text}</div>`;
export function empty({ ic = 'sparkles', title, text, action = '' }) {
  return `<div class="empty"><div class="art">${icon(ic)}</div><h3>${esc(title)}</h3><p>${text}</p>${action}</div>`;
}
export const skeleton = (h = 120, n = 1) => Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px;margin-bottom:12px"></div>`).join('');
export const errorBox = (msg, retry = true) => `<div class="glass error-box">${icon('alert')}<p>${esc(msg)}</p>${retry ? '<button class="btn" data-action="retry">Reintentar</button>' : ''}</div>`;

// ---------- Avisos ----------
export function toast(message, { action, onAction, error = false, timeout = 5000 } = {}) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' error' : '');
  el.setAttribute('role', error ? 'alert' : 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  host.appendChild(el);
  const close = () => el.remove();
  if (action) el.querySelector('button').onclick = async () => { close(); await onAction?.(); };
  setTimeout(close, action ? Math.max(timeout, 7000) : timeout);
  return close;
}
export const toastError = (e) => toast(e?.message || 'Algo salió mal. Inténtalo de nuevo.', { error: true });

// ---------- Hojas modales ----------
let openSheets = [];
export function sheet({ title, body, onMount, dialog = false, wide = false }) {
  const prevFocus = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const el = document.createElement('div');
  el.className = 'sheet' + (dialog ? ' dialog' : '');
  if (wide) el.style.width = 'min(760px, 96vw)';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="grabber"></div><div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="sheet-body">${body}</div>`;
  document.body.append(scrim, el);
  document.body.style.overflow = 'hidden';
  const api = {
    el,
    close() {
      scrim.remove(); el.remove();
      openSheets = openSheets.filter((s) => s !== api);
      if (!openSheets.length) document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
      api.onClose?.();
    },
    setBody(html) { el.querySelector('.sheet-body').innerHTML = html; },
  };
  const onKey = (e) => {
    if (openSheets[openSheets.length - 1] !== api) return;
    if (e.key === 'Escape') api.close();
    if (e.key === 'Tab') {
      const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', el).filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  scrim.onclick = () => api.close();
  el.querySelector('[data-close]').onclick = () => api.close();
  openSheets.push(api);
  onMount?.(el, api);
  setTimeout(() => (el.querySelector('[autofocus]') || el.querySelector('input, select, textarea, button:not([data-close])'))?.focus(), 60);
  return api;
}
export const closeAllSheets = () => [...openSheets].forEach((s) => s.close());

export function confirmDialog({ title, text, confirm = 'Confirmar', danger = false, input }) {
  return new Promise((resolve) => {
    let done = false;
    const s = sheet({
      title, dialog: true,
      body: `<p class="muted" style="margin-top:0">${text}</p>
        ${input ? `<div class="field" style="margin-bottom:14px"><label for="cf-in">${esc(input.label)}</label><input id="cf-in" class="input" type="${input.type || 'text'}" autocomplete="${input.autocomplete || 'off'}"></div>` : ''}
        <div class="grid-2"><button class="btn" data-no>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(confirm)}</button></div>`,
      onMount(el) {
        el.querySelector('[data-no]').onclick = () => s.close();
        el.querySelector('[data-yes]').onclick = () => { done = true; const v = input ? el.querySelector('#cf-in').value : true; s.close(); resolve(v); };
      },
    });
    s.onClose = () => { if (!done) resolve(false); };
  });
}

// Ejecuta una acción con el botón bloqueado para evitar dobles toques.
export async function busy(btn, fn) {
  if (!btn || btn.classList.contains('busy')) return;
  btn.classList.add('busy'); btn.setAttribute('aria-busy', 'true');
  try { return await fn(); } finally { btn.classList.remove('busy'); btn.removeAttribute('aria-busy'); }
}

export function formError(form, err) {
  let box = form.querySelector('.form-error');
  if (!box) { box = document.createElement('div'); box.className = 'form-error'; box.setAttribute('role', 'alert'); form.prepend(box); }
  box.innerHTML = `${icon('alert')}<span>${esc(err.message || err)}</span>`;
  $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid'));
  if (err.field) form.querySelector(`[name="${err.field}"]`)?.setAttribute('aria-invalid', 'true');
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
export const clearFormError = (form) => form.querySelector('.form-error')?.remove();

// Archivo de calendario (.ics) para agregar el recordatorio al calendario del teléfono.
export function icsFile({ title, start, count, alarmDays = 0, description = '' }) {
  const d = start.replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const clean = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JP Solution//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${d}-${Math.random().toString(36).slice(2)}@jp-solution`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${clean(title)}`,
    `DESCRIPTION:${clean(description)}`, `RRULE:FREQ=MONTHLY${count ? `;COUNT=${count}` : ''}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${clean(title)}`, `TRIGGER:${alarmDays ? `-P${alarmDays}D` : 'PT9H'}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'];
  return lines.join('\r\n');
}

export function download(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
