// Movimientos: búsqueda, filtros, lista agrupada por día y exportación CSV.
import { get } from '../api.js';
import { S, H, catsOf, today, category } from '../store.js';
import { icon, esc, money, empty, skeleton, fmtDay, addDays, addMonths, sheet, download, toast } from '../ui.js';
import { txItem } from './common.js';
import { openTxForm } from './txform.js';

const PERIODS = [['month', 'Este mes'], ['prev', 'Mes anterior'], ['90', 'Últimos 90 días'], ['year', 'Este año'], ['all', 'Todo'], ['custom', 'Personalizado']];
const TYPES = [['', 'Todos los tipos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['refund', 'Devoluciones'], ['transfer', 'Transferencias']];
const f = { period: 'month', q: '', type: '', category: '', account: '', member: '', from: '', to: '' };

function range() {
  const t = today();
  const sd = S.h.start_day;
  const curStart = Number(t.slice(8)) >= sd ? t.slice(0, 7) : addMonths(t.slice(0, 7), -1);
  const startOf = (ym) => `${ym}-${String(sd).padStart(2, '0')}`;
  switch (f.period) {
    case 'month': return [startOf(curStart), addDays(startOf(addMonths(curStart, 1)), -1)];
    case 'prev': return [startOf(addMonths(curStart, -1)), addDays(startOf(curStart), -1)];
    case '90': return [addDays(t, -90), t];
    case 'year': return [t.slice(0, 4) + '-01-01', t.slice(0, 4) + '-12-31'];
    case 'custom': return [f.from || addDays(t, -30), f.to || t];
    default: return ['', ''];
  }
}
function query(extra = {}) {
  const [from, to] = range();
  const p = new URLSearchParams({ ...(from && { from }), ...(to && { to }), ...(f.q && { q: f.q }), ...(f.type && { type: f.type }),
    ...(f.category && { category: f.category }), ...(f.account && { account: f.account }), ...(f.member && { member: f.member }), ...extra });
  return H('/transactions?' + p);
}
const activeFilters = () => ['type', 'category', 'account', 'member'].filter((k) => f[k]).length + (f.period !== 'month' ? 1 : 0);

export async function transactionsView(main, params) {
  if (params.account) { f.account = params.account; f.period = 'all'; }
  if (params.category) { f.category = params.category; }
  let items = [], more = false, offset = 0;
  main.innerHTML = `
    <div class="row" style="margin:6px 0 12px">
      <label class="glass grow row" style="padding:0 14px;border-radius:18px;gap:8px">${icon('search')}
        <input class="input" style="border:0;background:transparent;box-shadow:none;padding-left:0" type="search" placeholder="Buscar movimientos" value="${esc(f.q)}" data-search aria-label="Buscar movimientos"></label>
      <button class="icon-btn" data-filters aria-label="Filtros">${icon('filter')}${activeFilters() ? '<span class="dot"></span>' : ''}</button>
    </div>
    <div class="chips" style="margin-bottom:6px;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px">${PERIODS.filter(([k]) => k !== 'custom').map(([k, n]) => `<button class="cat-chip" style="padding:7px 13px;white-space:nowrap" data-period="${k}" aria-pressed="${f.period === k}">${n}</button>`).join('')}
      <button class="cat-chip" style="padding:7px 13px;white-space:nowrap" data-filters aria-pressed="${f.period === 'custom'}">${icon('calendar')} Rango</button></div>
    <div data-active></div>
    <div data-totals></div>
    <div data-list>${skeleton(70, 5)}</div>`;
  const listEl = main.querySelector('[data-list]');

  const renderActive = () => {
    const tags = [];
    if (f.type) tags.push(['type', TYPES.find((t) => t[0] === f.type)[1]]);
    if (f.category) tags.push(['category', category(f.category)?.name || 'Categoría']);
    if (f.account) tags.push(['account', S.accounts.find((a) => a.id === f.account)?.name || 'Cuenta']);
    if (f.member) tags.push(['member', S.members.find((m) => m.id === f.member)?.name || 'Integrante']);
    if (f.period === 'custom') { const [a, b] = range(); tags.push(['period', `${a} → ${b}`]); }
    main.querySelector('[data-active]').innerHTML = tags.length ? `<div class="chips" style="margin:6px 0">${tags.map(([k, n]) => `<button class="chip" data-clear="${k}" aria-label="Quitar filtro ${esc(n)}">${esc(n)} ${icon('x')}</button>`).join('')}</div>` : '';
  };

  async function load(reset = true) {
    if (reset) { offset = 0; items = []; listEl.innerHTML = skeleton(70, 4); }
    try {
      const r = await get(query({ limit: 100, offset }));
      items = items.concat(r.items); more = r.more; offset += r.items.length;
      draw();
    } catch (e) {
      listEl.innerHTML = `<div class="glass error-box">${esc(e.message)} <button class="btn btn-sm" data-retry>Reintentar</button></div>`;
    }
  }
  function draw() {
    renderActive();
    const inc = items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0) - items.filter((t) => t.type === 'refund').reduce((s, t) => s + t.amount, 0);
    main.querySelector('[data-totals]').innerHTML = items.length ? `<div class="glass card tight" style="margin:8px 0">
      <div class="row between small"><span class="muted">${items.length}${more ? '+' : ''} movimiento${items.length === 1 && !more ? '' : 's'}</span><button class="link-btn" data-export>${icon('download')} Exportar CSV</button></div>
      <div class="row between" style="margin-top:4px"><span class="small">Ingresos <b class="pos num">+${money(inc)}</b></span><span class="small">Gastos <b class="neg num">−${money(exp)}</b></span></div></div>` : '';
    if (!items.length) {
      const filtered = f.q || activeFilters();
      listEl.innerHTML = `<div class="glass">${filtered
        ? empty({ ic: 'search', title: 'Sin resultados', text: 'No hay movimientos con estos filtros. Prueba con otro período o quita filtros.', action: '<button class="btn" data-reset>Quitar filtros</button>' })
        : empty({ ic: 'list', title: 'Aún no hay movimientos', text: 'Registra tu primer gasto o ingreso, o importa un archivo CSV de tu banco.', action: '<div class="row wrap" style="justify-content:center"><button class="btn btn-primary" data-new>Registrar gasto</button><a class="btn" href="#/importar">Importar CSV</a></div>' })}</div>`;
      return;
    }
    let html = '', day = '';
    for (const t of items) {
      if (t.date !== day) { day = t.date; html += `<div class="day-head">${t.date > today() ? 'Programado · ' : ''}${esc(fmtDay(t.date))}</div>`; }
      html += txItem(t);
    }
    listEl.innerHTML = `<div class="list">${html}</div>${more ? '<button class="btn btn-block" style="margin-top:14px" data-more>Cargar más</button>' : ''}`;
  }

  let timer;
  main.querySelector('[data-search]').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { f.q = e.target.value.trim(); load(); }, 280); });
  main.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tx) return openTxForm({ id: b.dataset.tx });
    if (b.dataset.period) { f.period = b.dataset.period; main.querySelectorAll('[data-period]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return load(); }
    if (b.dataset.clear) { if (b.dataset.clear === 'period') f.period = 'month'; else f[b.dataset.clear] = ''; return transactionsView(main, {}); }
    if (b.hasAttribute('data-filters')) return openFilters(() => transactionsView(main, {}));
    if (b.hasAttribute('data-more')) return load(false);
    if (b.hasAttribute('data-retry')) return load();
    if (b.hasAttribute('data-new')) return openTxForm({ type: 'expense' });
    if (b.hasAttribute('data-reset')) { Object.assign(f, { period: 'month', q: '', type: '', category: '', account: '', member: '' }); return transactionsView(main, {}); }
    if (b.hasAttribute('data-export')) return exportCsv(b);
  };
  await load();
}

function openFilters(onApply) {
  const [from, to] = range();
  const opt = (list, sel) => list.map(([v, n]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const s = sheet({
    title: 'Filtros',
    body: `<form class="stack">
      <div class="field"><label>Período</label><select class="input" name="period">${opt(PERIODS, f.period)}</select></div>
      <div class="grid-2" data-custom ${f.period === 'custom' ? '' : 'hidden'}><div class="field"><label>Desde</label><input class="input" type="date" name="from" value="${from}"></div>
        <div class="field"><label>Hasta</label><input class="input" type="date" name="to" value="${to}"></div></div>
      <div class="field"><label>Tipo</label><select class="input" name="type">${opt(TYPES, f.type)}</select></div>
      <div class="field"><label>Categoría</label><select class="input" name="category"><option value="">Todas</option>
        <optgroup label="Gastos">${opt(catsOf('expense').map((c) => [c.id, c.name]), f.category)}</optgroup>
        <optgroup label="Ingresos">${opt(catsOf('income').map((c) => [c.id, c.name]), f.category)}</optgroup></select></div>
      <div class="field"><label>Cuenta</label><select class="input" name="account"><option value="">Todas</option>${opt(S.accounts.map((a) => [a.id, a.name + (a.archived ? ' (archivada)' : '')]), f.account)}</select></div>
      <div class="field"><label>Integrante</label><select class="input" name="member"><option value="">Todos</option>${opt(S.members.map((m) => [m.id, m.name]), f.member)}</select></div>
      <div class="grid-2"><button type="button" class="btn" data-reset>Limpiar</button><button class="btn btn-primary" type="submit">Aplicar</button></div></form>`,
  });
  const form = s.el.querySelector('form');
  form.period.onchange = () => { form.querySelector('[data-custom]').hidden = form.period.value !== 'custom'; };
  form.querySelector('[data-reset]').onclick = () => { Object.assign(f, { period: 'month', type: '', category: '', account: '', member: '' }); s.close(); onApply(); };
  form.onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (d.period === 'custom' && d.from && d.to && d.from > d.to) { toast('La fecha inicial debe ser anterior a la final.', { error: true }); return; }
    Object.assign(f, d);
    s.close(); onApply();
  };
}

// Exporta los movimientos que coinciden con los filtros actuales (todas las páginas).
export async function exportCsv(btn, fromTo) {
  btn?.classList.add('busy');
  try {
    let all = [], offset = 0, more = true;
    while (more) {
      const url = fromTo ? H(`/transactions?from=${fromTo[0]}&to=${fromTo[1]}&limit=500&offset=${offset}`) : query({ limit: 500, offset });
      const r = await get(url);
      all = all.concat(r.items); more = r.more; offset += r.items.length;
    }
    const cell = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const typeName = { income: 'Ingreso', expense: 'Gasto', refund: 'Devolución', transfer: 'Transferencia' };
    const rows = [['Fecha', 'Tipo', 'Descripción', 'Importe', 'Moneda', 'Cuenta', 'Cuenta destino', 'Categorías', 'Comercio', 'Integrante', 'Registrado por', 'Etiquetas', 'Notas']];
    for (const t of all) {
      const signed = t.type === 'expense' ? -t.amount : t.amount;
      rows.push([t.date, typeName[t.type], t.description, (signed / 100).toFixed(2), S.h.currency, t.account_name, t.to_account_name || '',
        t.splits.map((s) => `${category(s.category_id)?.name || ''}${t.splits.length > 1 ? ` (${(s.amount / 100).toFixed(2)})` : ''}`).join(' | '),
        t.merchant || '', t.member_name || '', t.created_by_name || '', (t.tags || []).join(', '), t.notes || '']);
    }
    download(`movimientos-${today()}.csv`, '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n'), 'text/csv;charset=utf-8');
  } catch (e) {
    toast(e.message, { error: true });
  } finally { btn?.classList.remove('busy'); }
}
