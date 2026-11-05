// Inicio: resumen del período con cifras calculadas a partir de los movimientos.
import { get } from '../api.js';
import { S, H } from '../store.js';
import { icon, esc, money, progress, hint, empty, skeleton, relDay, catIcon } from '../ui.js';
import { donut, bars, legend, table, PALETTE } from '../charts.js';
import { txItem, monthPicker, pctDelta, periodLabel, billStatus } from './common.js';
import { openTxForm } from './txform.js';
import { openPayBill } from './calendar.js';

let month = null;

export async function homeView(main) {
  main.innerHTML = skeleton(170) + `<div class="grid-2">${skeleton(110)}${skeleton(110)}</div>` + skeleton(60) + skeleton(200);
  const d = await get(H('/summary' + (month ? `?month=${month}` : '')));
  month = d.month;
  S.homeAlert = d.upcoming.some((o) => o.status === 'overdue');
  const bell = document.querySelector('.topbar .icon-btn[href="#/calendario"]');
  if (bell && S.homeAlert && !bell.querySelector('.dot')) bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
  const isCurrent = d.month === d.current;
  const incDelta = pctDelta(d.period.income, d.previous.income);
  const expDelta = pctDelta(d.period.expense, d.previous.expense);
  const deltaTxt = (v, goodWhenUp) => v === null ? '<span class="muted">Sin datos del mes anterior</span>'
    : `<span class="${(v >= 0) === goodWhenUp ? 'pos' : 'neg'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v)} %</span> <span class="muted">vs. mes anterior</span>`;
  const b = d.budget;
  const bPct = b.totalBudget ? (b.totalSpent / b.totalBudget) * 100 : 0;
  const credit = d.accounts.filter((a) => a.type === 'credit');
  const noData = !d.recent.length && !d.accounts.some((a) => a.balance);

  main.innerHTML = `
    <div class="row between wrap" style="margin:6px 4px 14px">
      <h2 class="page-h1" style="margin:0">Resumen del mes</h2>
      ${monthPicker(d.month, d.current)}
    </div>
    <div class="small muted" style="margin:-8px 4px 12px">Período: ${periodLabel(d.from, d.to)}</div>

    <div class="grid cols-2">
      <section class="glass hero" aria-labelledby="h-saldo">
        <div class="hero-icon">${icon('wallet')}</div>
        <div id="h-saldo" style="color:var(--ink-2);font-weight:500">Saldo disponible</div>
        <div class="big num">${money(d.assets)}</div>
        ${hint('Suma de efectivo, bancos y ahorros a hoy. Las tarjetas se restan aparte.')}
        <div class="grid-2" style="margin-top:14px;position:relative;z-index:1">
          <div><div class="small muted">Comprometido en pagos</div><div class="num" style="font-weight:650">${money(d.committed)}</div>
            <div class="tiny muted">${d.committedCount} factura${d.committedCount === 1 ? '' : 's'} hasta fin de período</div></div>
          <div><div class="small muted">Libre después de pagos</div><div class="num ${d.freeAfterCommitted < 0 ? 'neg' : ''}" style="font-weight:650">${money(d.freeAfterCommitted)}</div>
            <div class="tiny muted">Saldo disponible − comprometido</div></div>
        </div>
        ${credit.length ? `<div class="small" style="margin-top:12px;position:relative;z-index:1">${icon('card')} Debes en tarjetas: <b class="num">${money(d.creditOwed)}</b> · Patrimonio neto: <b class="num">${money(d.net)}</b></div>` : ''}
      </section>

      <div class="stack">
        <div class="grid-2">
          <div class="glass stat"><div class="badge-icon bi-mint">${icon('down')}</div><div class="label">Ingresos</div><div class="value num">${money(d.period.income)}</div><div class="delta">${deltaTxt(incDelta, true)}</div></div>
          <div class="glass stat"><div class="badge-icon bi-rose">${icon('up')}</div><div class="label">Gastos</div><div class="value num">${money(d.period.expense)}</div><div class="delta">${deltaTxt(expDelta, false)}</div></div>
        </div>
        ${hint('Ingresos y gastos del período. Las transferencias y pagos de tarjeta no cuentan; las devoluciones restan al gasto.')}
        <button class="btn btn-primary btn-lg btn-block" data-quick="expense">${icon('plus')} Registrar gasto</button>
        <div class="grid-2">
          <button class="btn" data-quick="income">${icon('down')} Ingreso</button>
          <button class="btn" data-quick="transfer">${icon('swap')} Transferencia</button>
        </div>
      </div>
    </div>

    ${noData ? `<div class="glass" style="margin-top:14px">${empty({ ic: 'sparkles', title: 'Empecemos', text: 'Registra tu primer gasto o ingreso. También puedes revisar tus cuentas o importar movimientos desde un archivo CSV.',
      action: '<div class="row wrap" style="justify-content:center"><a class="btn" href="#/cuentas">Revisar cuentas</a><a class="btn" href="#/importar">Importar CSV</a></div>' })}</div>` : ''}

    <div class="grid cols-2" style="margin-top:14px">
      <section class="glass card">
        <div class="row between"><h3>Presupuesto restante</h3><a class="link-btn" href="#/presupuesto">Ver</a></div>
        ${b.totalBudget ? `
          <div class="row between"><div class="num" style="font-size:1.6rem;font-weight:650" >${money(b.remaining)}</div><div class="small muted num">de ${money(b.totalBudget)}</div></div>
          <div style="margin:10px 0 6px">${progress(bPct, bPct > 100 ? 'over' : bPct > 85 ? 'warn' : 'lav')}</div>
          ${hint(`Presupuesto ${b.general ? 'general' : 'por categorías'} menos gastos del período (${money(b.totalSpent)}).`)}`
        : `<p class="muted small">Aún no tienes presupuesto para este mes.</p><a class="btn btn-sm" href="#/presupuesto">${icon('plus')} Crear presupuesto</a>`}
      </section>

      <section class="glass card">
        <div class="row between"><h3>Próximos pagos</h3><a class="link-btn" href="#/calendario">Calendario</a></div>
        ${d.upcoming.length ? `<div class="list">${d.upcoming.slice(0, 4).map((o) => `
          <div class="row" style="padding:4px 0"><div class="badge-icon ${o.status === 'overdue' ? 'bi-rose' : 'bi-ice'}">${icon('calendar')}</div>
            <div class="grow"><div style="font-weight:600" class="ellipsis">${esc(o.name)}</div><div class="small muted">${relDay(o.due_date, d.today)} · ${billStatus(o)}</div></div>
            <div style="text-align:right"><div class="num" style="font-weight:650">${money(o.remaining)}</div>
            <button class="link-btn" data-pay="${o.id}">Pagar</button></div></div>`).join('')}</div>`
        : `<p class="muted small">No hay pagos pendientes. Agrega tus facturas para ver los próximos vencimientos.</p><a class="btn btn-sm" href="#/calendario">${icon('plus')} Agregar factura</a>`}
      </section>

      <section class="glass card">
        <div class="row between"><h3>Ahorro y metas</h3><a class="link-btn" href="#/metas">Metas</a></div>
        <div class="row between"><div><div class="small muted">Ahorro acumulado</div><div class="num" style="font-size:1.4rem;font-weight:650">${money(d.savings)}</div></div>
          <div class="badge-icon bi-lav">${icon('piggy')}</div></div>
        ${hint('Saldo de tus cuentas de ahorro. Las metas de «solo seguimiento» no se suman aquí para no contar dos veces el mismo dinero.')}
        ${d.goals.length ? `<div class="stack" style="margin-top:12px;gap:12px">${d.goals.slice(0, 3).map((g) => `
          <div><div class="row between small"><span style="font-weight:600">${esc(g.name)}</span><span class="num muted">${money(g.saved, { compact: true })} de ${money(g.target, { compact: true })} · <b>${g.pct} %</b></span></div>
          <div style="margin-top:6px">${progress(g.pct, g.mode === 'account' ? '' : 'lav')}</div></div>`).join('')}</div>`
        : `<p class="muted small" style="margin-top:10px">Crea una meta para la casa, las vacaciones o tu fondo de emergencia.</p>`}
      </section>

      <section class="glass card">
        <h3>Gastos por categoría</h3>
        ${d.spending.length ? `<div class="row wrap" style="align-items:center;gap:18px">
          <div style="flex:0 0 160px">${donut(d.spending.slice(0, 6).map((c, i) => ({ name: c.name, value: c.spent, color: c.color || PALETTE[i] })).concat(d.spending.length > 6 ? [{ name: 'Otras', value: d.spending.slice(6).reduce((s, c) => s + c.spent, 0), color: '#c7c9d9' }] : []), { size: 160, label: money(d.period.expense, { compact: true }), sub: 'gastado' })}</div>
          <div class="grow stack" style="gap:8px">${d.spending.slice(0, 5).map((c) => `<div class="row small">${catIcon(c)}<span class="grow ellipsis">${esc(c.name)}</span><b class="num">${money(c.spent)}</b></div>`).join('')}</div></div>
          ${table(['Categoría', 'Gastado'], d.spending.map((c) => [c.name, money(c.spent)]))}`
        : '<p class="muted small">Cuando registres gastos verás aquí en qué se va el dinero.</p>'}
      </section>

      <section class="glass card">
        <h3>Comparación con el mes anterior</h3>
        ${bars([{ label: 'Mes anterior', bars: [{ name: 'Ingresos', value: d.previous.income, color: '#8ae6c2' }, { name: 'Gastos', value: d.previous.expense, color: '#f7a1b9' }] },
          { label: 'Este período', bars: [{ name: 'Ingresos', value: d.period.income, color: '#3cc4a0' }, { name: 'Gastos', value: d.period.expense, color: '#e0507e' }] }], { height: 170 })}
        ${legend([{ name: 'Ingresos', color: '#3cc4a0' }, { name: 'Gastos', color: '#e0507e' }])}
        ${table(['Período', 'Ingresos', 'Gastos', 'Diferencia'], [
          ['Mes anterior', money(d.previous.income), money(d.previous.expense), money(d.previous.income - d.previous.expense)],
          ['Este período', money(d.period.income), money(d.period.expense), money(d.period.income - d.period.expense)]])}
      </section>

      <section class="glass card">
        <div class="row between"><h3>Cuentas</h3><a class="link-btn" href="#/cuentas">Administrar</a></div>
        <div class="stack" style="gap:10px">${d.accounts.map((a) => `<div class="row small"><span class="grow ellipsis">${esc(a.name)}</span>
          <b class="num ${a.balance < 0 ? 'neg' : ''}">${a.type === 'credit' ? `Debes ${money(a.owed)}` : money(a.balance)}</b></div>`).join('') || '<p class="muted small">Sin cuentas activas.</p>'}</div>
      </section>
    </div>

    <div class="section-title"><span>Últimos movimientos</span><a href="#/movimientos">Ver todos</a></div>
    ${d.recent.length ? `<div class="list">${d.recent.map((t) => txItem(t, { showDate: true })).join('')}</div>`
      : `<div class="glass">${empty({ ic: 'list', title: 'Sin movimientos todavía', text: 'Toca «Registrar gasto» para agregar el primero.' })}</div>`}
    ${!isCurrent ? hint('Estás viendo un período anterior. Los saldos siempre son los de hoy.') : ''}`;

  main.onclick = (e) => {
    const q = e.target.closest('[data-quick]');
    if (q) return openTxForm({ type: q.dataset.quick });
    const t = e.target.closest('[data-tx]');
    if (t) return openTxForm({ id: t.dataset.tx });
    const m = e.target.closest('[data-month]');
    if (m && !m.disabled) { month = m.dataset.month; homeView(main); return; }
    const p = e.target.closest('[data-pay]');
    if (p) { const o = d.upcoming.find((x) => x.id === p.dataset.pay); openPayBill(o); }
  };
}
