// Piezas compartidas entre pantallas.
import { locale, L } from '../i18n.js';
import { S, category, member } from '../store.js';
import { icon, esc, money, catIcon, avatar, fmtShortMonth, fmtMonth, addMonths } from '../ui.js';

const TYPE_STYLE = {
  income: { ic: 'down', color: '#22a77a', label: 'Ingreso' },
  refund: { ic: 'undo', color: '#3cc4a0', label: 'Devolución' },
  transfer: { ic: 'swap', color: '#5aa9f5', label: 'Transferencia' },
};

export function txItem(t, { showDate = false } = {}) {
  const cat = t.splits?.length ? category(t.splits[0].category_id) : null;
  const look = t.type === 'expense' ? null : TYPE_STYLE[t.type];
  const ic = t.type === 'expense' || t.type === 'income' ? catIcon(cat || { icon: look?.ic, color: look?.color }) : catIcon({ icon: look.ic, color: look.color });
  const sign = t.type === 'expense' ? -t.amount : t.type === 'transfer' ? 0 : t.amount;
  const amountTxt = t.type === 'transfer' ? money(t.amount) : money(sign, { sign: true });
  const sub = [
    t.type === 'transfer' ? `${esc(t.account_name)} → ${esc(t.to_account_name)}` : (t.splits?.length > 1 ? `${t.splits.length} ${L('categorías', 'categories')}` : esc(cat?.name || look?.label || '')),
    t.type !== 'transfer' ? esc(t.account_name) : '',
    showDate ? new Date(t.date + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) : '',
  ].filter(Boolean).join(' · ');
  const m = member(t.member_id) || { name: t.member_name || 'Exintegrante', color: '#a1a1b5' };
  return `<button class="item glass" data-tx="${t.id}" aria-label="${esc(t.description)}, ${amountTxt}">
    ${ic}
    <div class="grow"><div class="title ellipsis">${esc(t.description)}${t.recurring_id ? ` <span class="muted" title="Recurrente">${icon('repeat', 'tiny')}</span>` : ''}${t.has_receipt ? ` <span class="muted" title="Con comprobante">${icon('clip')}</span>` : ''}</div>
      <div class="sub ellipsis">${sub}</div></div>
    <div style="display:grid;justify-items:end;gap:3px">
      <div class="amount num ${t.type === 'expense' ? 'neg' : t.type === 'transfer' ? '' : 'pos'}">${amountTxt}</div>
      <span class="who small muted">${avatar(m)}</span></div>
  </button>`;
}

export function monthPicker(month, current) {
  return `<div class="row" style="gap:6px">
    <button class="icon-btn" data-month="${addMonths(month, -1)}" aria-label="Mes anterior">${icon('left')}</button>
    <div class="glass" style="padding:9px 14px;border-radius:999px;font-weight:600;min-width:150px;text-align:center">${esc(fmtMonth(month))}</div>
    <button class="icon-btn" data-month="${addMonths(month, 1)}" aria-label="Mes siguiente" ${month >= current ? 'disabled style="opacity:.4"' : ''}>${icon('right')}</button>
  </div>`;
}

export const pctDelta = (now, before) => {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
};
export const periodLabel = (from, to) => `${new Date(from + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' })} – ${new Date(to + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}`;
export { fmtShortMonth };
export const ACCOUNT_TYPES = { cash: ['Efectivo', 'wallet', '#3cc4a0'], bank: ['Cuenta bancaria', 'bank', '#5aa9f5'], savings: ['Ahorros', 'piggy', '#8b7cf6'], credit: ['Tarjeta de crédito', 'card', '#f28bb6'] };
export const billStatus = (o) => o.status === 'paid' ? '<span class="chip mint">Pagada</span>'
  : o.status === 'overdue' ? `<span class="chip rose">Vencida${o.partial ? ' · parcial' : ''}</span>`
  : `<span class="chip ice">Pendiente${o.partial ? ' · parcial' : ''}</span>`;
export const roleName = (r) => (r === 'admin' ? 'Administrador' : 'Miembro');
export const memberName = (id) => member(id)?.name || 'Exintegrante';
export const isCurrentUser = (id) => id === S.me?.user?.id;
