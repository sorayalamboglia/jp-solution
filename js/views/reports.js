// Informes por mes, trimestre, año o rango personalizado, con exportación CSV y resumen imprimible.
import { locale, L } from '../i18n.js';
import { get } from '../api.js';
import { S, H, today } from '../store.js';
import { icon, esc, money, hint, skeleton, addDays, fmtDate, fmtMonth, progress, catIcon } from '../ui.js';
import { bars, line, donut, legend, table, PALETTE } from '../charts.js';
import { exportCsv } from './transactions.js';

const RANGES = [['month', 'Mes'], ['quarter', 'Trimestre'], ['year', 'Año'], ['custom', 'Personalizado']];
const st = { kind: 'month', offset: 0, from: '', to: '' };

function rangeOf() {
  const t = today();
  const y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7));
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (st.kind === 'month') {
    const tot = y * 12 + (m - 1) + st.offset, yy = Math.floor(tot / 12), mm = (tot % 12) + 1;
    return [`${yy}-${pad(mm)}-01`, `${yy}-${pad(mm)}-${lastDay(yy, mm)}`, fmtMonth(`${yy}-${pad(mm)}`)];
  }
  if (st.kind === 'quarter') {
    const q0 = Math.floor((m - 1) / 3) + st.offset, tot = y * 4 + q0, yy = Math.floor(tot / 4), q = ((tot % 4) + 4) % 4;
    return [`${yy}-${pad(q * 3 + 1)}-01`, `${yy}-${pad(q * 3 + 3)}-${lastDay(yy, q * 3 + 3)}`, `Trimestre ${q + 1} de ${yy}`];
  }
  if (st.kind === 'year') { const yy = y + st.offset; return [`${yy}-01-01`, `${yy}-12-31`, `Año ${yy}`]; }
  const from = st.from || addDays(t, -90), to = st.to || t;
  return [from, to, `${fmtDate(from)} – ${fmtDate(to)}`];
}

export async function reportsView(main) {
  const [from, to, label] = rangeOf();
  main.innerHTML = `
    <div class="seg no-print" role="group" aria-label="Tipo de informe" style="margin:6px 0 12px">${RANGES.map(([k, n]) => `<button data-kind="${k}" aria-pressed="${st.kind === k}">${n}</button>`).join('')}</div>
    <div class="row between wrap no-print" style="margin-bottom:12px">
      ${st.kind === 'custom' ? `<div class="row wrap"><input class="input" type="date" data-from value="${from}" aria-label="Desde" style="width:auto"><span>→</span><input class="input" type="date" data-to value="${to}" aria-label="Hasta" style="width:auto"><button class="btn btn-sm" data-apply>Aplicar</button></div>`
        : `<div class="row"><button class="icon-btn" data-off="-1" aria-label="Anterior">${icon('left')}</button><b style="min-width:150px;text-align:center">${esc(label)}</b><button class="icon-btn" data-off="1" aria-label="Siguiente">${icon('right')}</button></div>`}
      <div class="row"><button class="btn btn-sm" data-csv>${icon('download')} CSV</button><button class="btn btn-sm" data-print>${icon('print')} Imprimir</button></div>
    </div>
    <div data-body>${skeleton(130)}${skeleton(220, 2)}</div>`;
  const body = main.querySelector('[data-body]');
  main.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.kind) { st.kind = b.dataset.kind; st.offset = 0; return reportsView(main); }
    if (b.dataset.off) { st.offset += Number(b.dataset.off); return reportsView(main); }
    if (b.hasAttribute('data-apply')) {
      const f = main.querySelector('[data-from]').value, t = main.querySelector('[data-to]').value;
      if (!f || !t || f > t) { body.insertAdjacentHTML('afterbegin', '<div class="form-error">Elige un rango válido: la fecha inicial debe ser anterior a la final.</div>'); return; }
      st.from = f; st.to = t; return reportsView(main);
    }
    if (b.hasAttribute('data-csv')) return exportCsv(b, [from, to]);
    if (b.hasAttribute('data-print')) { main.querySelectorAll('details').forEach((d) => (d.open = true)); return window.print(); }
  };

  let r;
  try { r = await get(H(`/reports?from=${from}&to=${to}`)); }
  catch (e) { body.innerHTML = `<div class="glass error-box">${esc(e.message)}</div>`; return; }
  const net = r.totals.income - r.totals.expense;
  const weekly = r.series.length && r.series[0].label.length === 10;
  const short = (s) => weekly ? fmtDate(s.label, { day: 'numeric', month: 'short' }) : new Date(s.label + '-01T12:00:00').toLocaleDateString(locale(), { month: 'short' });
  const totalCat = r.categories.reduce((s, c) => s + c.spent, 0);

  body.innerHTML = `
    <div class="print-only"><h1>JP Solution · ${esc(S.h.name)}</h1><p>Informe: ${esc(label)} (${esc(from)} a ${esc(to)})</p></div>
    <div class="grid-3">
      <div class="glass stat"><div class="badge-icon bi-mint">${icon('down')}</div><div class="label">Ingresos</div><div class="value num">${money(r.totals.income)}</div></div>
      <div class="glass stat"><div class="badge-icon bi-rose">${icon('up')}</div><div class="label">Gastos</div><div class="value num">${money(r.totals.expense)}</div></div>
      <div class="glass stat"><div class="badge-icon bi-lav">${icon('wallet')}</div><div class="label">Diferencia</div><div class="value num ${net < 0 ? 'neg' : 'pos'}">${money(net, { sign: true })}</div></div>
    </div>
    ${hint('Gastos = gastos − devoluciones. Las transferencias entre cuentas propias no se incluyen.')}

    <div class="grid cols-2" style="margin-top:14px">
      <section class="glass card"><h3>Ingresos frente a gastos</h3>
        ${bars(r.series.map((s) => ({ label: short(s), bars: [{ name: 'Ingresos', value: s.income, color: '#3cc4a0' }, { name: 'Gastos', value: s.expense, color: '#e0507e' }] })), { height: 200 })}
        ${legend([{ name: 'Ingresos', color: '#3cc4a0' }, { name: 'Gastos', color: '#e0507e' }])}
        ${table([weekly ? 'Semana desde' : 'Mes', 'Ingresos', 'Gastos', 'Diferencia'], r.series.map((s) => [s.label, money(s.income), money(s.expense), money(s.income - s.expense)]))}
      </section>
      <section class="glass card"><h3>Evolución del saldo</h3>
        ${line(r.series.map((s) => ({ label: s.to, short: short(s), value: s.balance })), { name: 'Saldo total', color: '#8b7cf6' })}
        <div class="row between small" style="margin-top:6px"><span>Inicio <b class="num">${money(r.startBalance)}</b></span><span>Fin <b class="num">${money(r.endBalance)}</b></span></div>
        ${hint('Saldo total de todas las cuentas (las tarjetas restan) al cierre de cada período.')}
        ${table(['Al cierre de', 'Saldo'], r.series.map((s) => [s.to > r.today ? r.today : s.to, money(s.balance)]))}
      </section>
      <section class="glass card"><h3>Categorías con mayor gasto</h3>
        ${r.categories.length ? `${donut(r.categories.slice(0, 7).map((c, i) => ({ name: c.name, value: c.spent, color: c.color || PALETTE[i] })), { label: money(totalCat, { compact: true }), sub: 'total' })}
          <div class="stack" style="gap:8px;margin-top:12px">${r.categories.slice(0, 8).map((c) => `<div class="row small">${catIcon(c)}<span class="grow ellipsis">${esc(c.name)}</span><span class="muted num">${Math.round((c.spent / totalCat) * 100)} %</span><b class="num">${money(c.spent)}</b></div>`).join('')}</div>
          ${table(['Categoría', 'Gastado', '%'], r.categories.map((c) => [c.name, money(c.spent), `${Math.round((c.spent / totalCat) * 100)} %`]))}`
          : '<p class="muted small">Sin gastos en este período.</p>'}
      </section>
      <section class="glass card"><h3>Comparación con el presupuesto</h3>
        ${r.budgets.length ? `${bars(r.budgets.map((b) => ({ label: new Date(b.month + '-01T12:00:00').toLocaleDateString(locale(), { month: 'short' }), bars: [{ name: 'Presupuesto', value: b.budget, color: '#c4b5fd' }, { name: 'Gastado', value: b.spent, color: '#7c8cf8' }] })), { height: 180 })}
          ${legend([{ name: 'Presupuesto', color: '#c4b5fd' }, { name: 'Gastado', color: '#7c8cf8' }])}
          ${table(['Mes', 'Presupuesto', 'Gastado', 'Diferencia'], r.budgets.map((b) => [b.month, money(b.budget), money(b.spent), money(b.budget - b.spent)]))}`
          : '<p class="muted small">No hay presupuestos en este período. Crea uno en la sección Presupuesto.</p>'}
      </section>
      <section class="glass card"><h3>Avance de las metas</h3>
        ${r.goals.length ? `<div class="stack" style="gap:12px">${r.goals.map((g) => `<div><div class="row between small"><b>${esc(g.name)}</b><span class="num">${money(g.saved)} ${L('de', 'of')} ${money(g.target)} · ${g.pct} %</span></div><div style="margin-top:6px">${progress(g.pct, g.mode === 'account' ? '' : 'lav')}</div></div>`).join('')}</div>`
          : '<p class="muted small">Aún no hay metas.</p>'}
      </section>
      <section class="glass card"><h3>Por integrante</h3>
        ${r.byMember.length ? `<div class="stack" style="gap:8px">${r.byMember.map((m) => `<div class="row small"><span class="grow">${esc(m.name || 'Exintegrante')}</span><span class="pos num">+${money(m.income)}</span><span class="neg num">−${money(m.spent)}</span></div>`).join('')}</div>
          ${hint('Movimientos asignados a cada integrante en el período.')}` : '<p class="muted small">Sin movimientos.</p>'}
      </section>
    </div>`;
}
