// Presupuesto mensual: general y por categoría, con avisos al acercarse o superar el límite.
import { get, put, post } from '../api.js';
import { S, H, catsOf, category, changed } from '../store.js';
import { icon, esc, money, progress, hint, empty, skeleton, sheet, busy, formError, parseMoney, centsToInput, catIcon, toast, addMonths, fmtMonth } from '../ui.js';
import { monthPicker, periodLabel } from './common.js';

let month = null;

export async function budgetView(main) {
  main.innerHTML = skeleton(150) + skeleton(80, 4);
  const b = await get(H('/budgets' + (month ? `?month=${month}` : '')));
  month = b.month;
  const current = Number(b.today.slice(8)) >= S.h.start_day ? b.today.slice(0, 7) : addMonths(b.today.slice(0, 7), -1);
  const pct = b.totalBudget ? (b.totalSpent / b.totalBudget) * 100 : 0;
  const spentByCat = new Map();
  const lines = b.lines.map((l) => ({ ...l, cat: category(l.category_id) })).filter((l) => l.cat)
    .sort((a, b2) => (b2.spent / (b2.available || 1)) - (a.spent / (a.available || 1)));
  lines.forEach((l) => spentByCat.set(l.category_id, l));
  const unbudgeted = catsOf('expense').filter((c) => !spentByCat.has(c.id));
  const over = lines.filter((l) => l.remaining < 0);
  const near = lines.filter((l) => l.remaining >= 0 && l.available > 0 && l.spent / l.available >= 0.85);

  main.innerHTML = `
    <div class="row" style="margin:6px 4px 6px;justify-content:center">${monthPicker(month, addMonths(current, 1))}</div>
    <div class="small muted" style="margin:0 4px 12px;text-align:center">Período: ${periodLabel(b.from, b.to)}</div>

    <section class="glass hero">
      <div class="hero-icon">${icon('pie')}</div>
      <div style="color:var(--ink-2);font-weight:500">Restante del mes</div>
      <div class="big num ${b.remaining < 0 ? 'neg' : ''}">${money(b.remaining)}</div>
      <div class="row between small" style="position:relative;z-index:1"><span>Usado <b class="num">${money(b.totalSpent)}</b></span><span>Presupuesto <b class="num">${money(b.totalBudget)}</b></span></div>
      <div style="margin:10px 0 6px;position:relative;z-index:1">${progress(pct, pct > 100 ? 'over' : pct >= 85 ? 'warn' : 'lav')}</div>
      ${hint(b.general ? 'Presupuesto general del hogar menos todos los gastos del período.' : 'Suma de los presupuestos por categoría (incluye lo acumulado) menos todos los gastos del período.')}
      ${b.unbudgetedSpent ? `<div class="small" style="margin-top:6px;position:relative;z-index:1">${icon('info')} ${money(b.unbudgetedSpent)} se gastaron en categorías sin presupuesto.</div>` : ''}
    </section>

    ${over.length || near.length ? `<div class="glass card tight" style="margin-top:12px;background:var(--rose-soft)">
      ${over.map((l) => `<div class="small">${icon('alert')} <b>${esc(l.cat.name)}</b> superó su límite por <b class="num">${money(-l.remaining)}</b>.</div>`).join('')}
      ${near.map((l) => `<div class="small">${icon('info')} <b>${esc(l.cat.name)}</b> ya usó el ${Math.round((l.spent / l.available) * 100)} % de su presupuesto.</div>`).join('')}</div>` : ''}

    <div class="row wrap" style="margin:14px 0">
      ${!b.lines.length && b.prevHasBudget ? `<button class="btn btn-primary" data-copy>${icon('copy')} Copiar de ${esc(fmtMonth(addMonths(month, -1)))}</button>` : ''}
      <button class="btn" data-general>${icon('wallet')} ${b.general ? 'Editar' : 'Definir'} presupuesto general</button>
      ${b.lines.length && b.prevHasBudget ? `<button class="btn btn-ghost" data-copy>${icon('copy')} Completar con el mes anterior</button>` : ''}
    </div>

    ${lines.length ? `<div class="section-title"><span>Por categoría</span></div><div class="grid cols-2">${lines.map((l) => {
      const p = l.available ? (l.spent / l.available) * 100 : (l.spent > 0 ? 101 : 0);
      return `<button class="glass item" style="display:block" data-edit="${l.category_id}" aria-label="Editar presupuesto de ${esc(l.cat.name)}">
        <div class="row">${catIcon(l.cat)}<div class="grow"><div class="title">${esc(l.cat.name)}</div>
          <div class="sub num">Usado ${money(l.spent)} de ${money(l.available)}</div></div>
          <div style="text-align:right"><div class="amount num ${l.remaining < 0 ? 'neg' : ''}">${money(l.remaining)}</div><div class="tiny muted">${l.remaining < 0 ? 'excedido' : 'restante'}</div></div></div>
        <div style="margin-top:10px">${progress(p, p > 100 ? 'over' : p >= 85 ? 'warn' : 'mint')}</div>
        <div class="row wrap" style="gap:6px;margin-top:8px">${l.rollover ? `<span class="chip ice">${icon('repeat')} Acumula sobrante</span>` : ''}${l.carried ? `<span class="chip mint">+${money(l.carried)} del mes anterior</span>` : ''}${p > 100 ? '<span class="chip rose">Límite superado</span>' : p >= 85 ? '<span class="chip amber">Cerca del límite</span>' : ''}</div>
      </button>`;
    }).join('')}</div>`
    : `<div class="glass" style="margin-top:6px">${empty({ ic: 'pie', title: 'Sin presupuesto por categoría', text: 'Asigna un importe a las categorías donde quieres controlar el gasto, como supermercado o transporte.' })}</div>`}

    ${unbudgeted.length ? `<div class="section-title"><span>Categorías sin presupuesto</span></div>
      <div class="chips">${unbudgeted.map((c) => `<button class="cat-chip" data-edit="${c.id}">${catIcon(c)}${esc(c.name)} ${icon('plus')}</button>`).join('')}</div>
      ${hint('Las categorías se pueden editar en Menú → Categorías.')}` : ''}`;

  main.onclick = async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.month) { month = t.dataset.month; return budgetView(main); }
    if (t.dataset.edit) return editLine(t.dataset.edit, spentByCat.get(t.dataset.edit));
    if (t.hasAttribute('data-general')) return editLine('', b.general ? { amount: b.general.amount } : null);
    if (t.hasAttribute('data-copy')) {
      busy(t, async () => {
        try {
          const r = await post(H('/budgets/copy'), { month });
          toast(r.copied ? `Se copiaron ${r.copied} importes del mes anterior.` : 'No había importes nuevos para copiar.');
          budgetView(main);
        } catch (err) { toast(err.message, { error: true }); }
      });
    }
  };

  function editLine(catId, line) {
    const c = catId ? category(catId) : null;
    const s = sheet({
      title: c ? `Presupuesto · ${c.name}` : 'Presupuesto general',
      body: `<form class="stack" novalidate>
        <div class="amount-wrap"><input class="input amount-input num" name="amount" inputmode="decimal" placeholder="0.00" value="${line ? centsToInput(line.amount) : ''}" aria-label="Importe presupuestado" autofocus></div>
        ${c ? `<label class="check"><input type="checkbox" name="rollover" ${line?.rollover ? 'checked' : ''}> Acumular el sobrante al mes siguiente</label>
          ${hint('Si sobra dinero en esta categoría, se suma al presupuesto del mes siguiente. Si te pasas, el mes siguiente empieza sin acumulado.')}`
          : hint('El presupuesto general es el tope de gasto total del hogar en el período. Si no lo defines, se usa la suma de las categorías.')}
        ${line?.spent !== undefined ? `<div class="small muted">Gastado en este período: <b class="num">${money(line.spent)}</b></div>` : ''}
        <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar</button>
        ${line ? '<button type="button" class="btn btn-ghost btn-block" data-remove style="color:var(--neg)">Quitar del presupuesto</button>' : ''}
      </form>`,
    });
    const form = s.el.querySelector('form');
    const save = (amount) => busy(form.querySelector('[type=submit]'), async () => {
      try {
        await put(H('/budgets'), { month, category_id: catId, amount, rollover: form.rollover?.checked || false });
        s.close(); toast('Presupuesto actualizado.'); await changed();
      } catch (err) { formError(form, err); }
    });
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = parseMoney(form.amount.value);
      if (Number.isNaN(v)) return formError(form, { message: 'Escribe un importe válido.', field: 'amount' });
      save(v);
    };
    form.querySelector('[data-remove]')?.addEventListener('click', () => save(null));
  }
}
