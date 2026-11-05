// Calendario familiar de pagos: vista mensual, próximos vencimientos y administración de facturas.
import { get, post, patch, del, newClientId } from '../api.js';
import { S, H, catsOf, activeAccounts, account, changed, today } from '../store.js';
import { icon, esc, money, hint, empty, skeleton, sheet, busy, formError, clearFormError, parseMoney, centsToInput, toast, confirmDialog, addDays, addMonths, fmtMonth, fmtDay, relDay, fmtDate } from '../ui.js';
import { billStatus } from './common.js';
import { L, tr } from '../i18n.js';

const FREQ = [['monthly', 'Mensual'], ['once', 'Una sola vez'], ['weekly', 'Semanal'], ['biweekly', 'Quincenal (cada 15 días)'], ['yearly', 'Anual']];
let viewMonth = null, selected = null;

export async function calendarView(main) {
  const t = today();
  viewMonth = viewMonth || t.slice(0, 7);
  main.innerHTML = skeleton(320) + skeleton(70, 3);
  const first = viewMonth + '-01';
  const startGrid = addDays(first, -((new Date(first + 'T12:00:00').getDay() + 6) % 7));
  const endGrid = addDays(startGrid, 41);
  const listTo = addDays(t, 45) > endGrid ? addDays(t, 45) : endGrid;
  const [cal, bills] = await Promise.all([get(H(`/calendar?from=${startGrid < t ? startGrid : t}&to=${listTo}`)), get(H('/bills'))]);
  const items = cal.items;
  const byDay = {};
  items.forEach((o) => (byDay[o.due_date] ||= []).push(o));
  const overdue = cal.overdueBefore.concat(items.filter((o) => o.status === 'overdue'));
  const upcoming = items.filter((o) => o.remaining > 0 && o.due_date >= t && o.due_date <= addDays(t, 30));
  const monthItems = items.filter((o) => o.due_date.startsWith(viewMonth));
  const monthTotal = monthItems.reduce((s, o) => s + o.amount, 0);
  const monthPending = monthItems.reduce((s, o) => s + o.remaining, 0);
  const dows = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const occRow = (o) => `<button class="item glass" data-occ="${o.id}">
    <div class="badge-icon ${o.status === 'overdue' ? 'bi-rose' : o.status === 'paid' ? 'bi-mint' : 'bi-ice'}">${icon(o.status === 'paid' ? 'check' : 'calendar')}</div>
    <div class="grow"><div class="title ellipsis">${esc(o.name)}</div><div class="sub">${relDay(o.due_date, t)} · ${billStatus(o)}</div></div>
    <div style="text-align:right"><div class="amount num">${money(o.status === 'paid' ? o.amount : o.remaining)}</div>${o.partial ? `<div class="tiny muted num">pagado ${money(o.paid)}</div>` : ''}</div></button>`;

  const dayList = selected ? (byDay[selected] || []) : null;
  main.innerHTML = `
    <div class="grid cols-2">
      <section class="glass card">
        <div class="row between" style="margin-bottom:10px">
          <button class="icon-btn" data-nav="-1" aria-label="Mes anterior">${icon('left')}</button>
          <h3 style="margin:0">${esc(fmtMonth(viewMonth))}</h3>
          <button class="icon-btn" data-nav="1" aria-label="Mes siguiente">${icon('right')}</button>
        </div>
        <div class="cal" role="grid" aria-label="Calendario de pagos">
          ${dows.map((d) => `<div class="dow" aria-hidden="true">${d}</div>`).join('')}
          ${Array.from({ length: 42 }, (_, i) => {
            const d = addDays(startGrid, i);
            const its = byDay[d] || [];
            const label = `${fmtDay(d)}${its.length ? `: ${its.length} pago${its.length > 1 ? 's' : ''}` : ''}`;
            return `<button class="day ${d.startsWith(viewMonth) ? '' : 'out'} ${d === t ? 'today' : ''}" data-day="${d}" aria-pressed="${d === selected}" aria-label="${esc(label)}">
              <span>${Number(d.slice(8))}</span><span class="dots">${its.slice(0, 3).map((o) => `<i class="st-${o.status}"></i>`).join('')}</span></button>`;
          }).join('')}
        </div>
        <div class="legend" style="margin-top:10px"><span><i class="st-pending"></i>Pendiente</span><span><i class="st-paid"></i>Pagada</span><span><i class="st-overdue"></i>Vencida</span></div>
        <div class="row between small" style="margin-top:10px"><span>Total del mes <b class="num">${money(monthTotal)}</b></span><span>Pendiente <b class="num">${money(monthPending)}</b></span></div>
      </section>

      <div class="stack">
        ${dayList ? `<div class="section-title" style="margin-top:0"><span>${esc(fmtDay(selected))}</span><button class="link-btn" data-day="">Ver próximos</button></div>
          ${dayList.length ? `<div class="list">${dayList.map(occRow).join('')}</div>` : '<div class="glass card muted small">No hay pagos este día.</div>'}`
        : `${overdue.length ? `<div class="section-title" style="margin-top:0"><span class="neg">Vencidas</span></div><div class="list">${overdue.map(occRow).join('')}</div>` : ''}
          <div class="section-title" ${overdue.length ? '' : 'style="margin-top:0"'}><span>Próximos 30 días</span></div>
          ${upcoming.length ? `<div class="list">${upcoming.map(occRow).join('')}</div>` : `<div class="glass card muted small">No hay vencimientos pendientes en los próximos 30 días.</div>`}`}
        <button class="btn btn-primary btn-block" data-new>${icon('plus')} Nueva factura</button>
      </div>
    </div>

    <div class="section-title"><span>Facturas del hogar</span></div>
    ${bills.length ? `<div class="grid cols-2">${bills.map((b) => `<button class="item glass" data-bill="${b.id}" ${b.active ? '' : 'style="opacity:.6"'}>
      <div class="badge-icon bi-lav">${icon('file')}</div>
      <div class="grow"><div class="title ellipsis">${esc(b.name)}</div><div class="sub">${tr(FREQ.find((f) => f[0] === b.frequency)?.[1])}${b.next ? ` · ${L('próxima', 'next')} ${fmtDate(b.next.due_date, { day: 'numeric', month: 'short' })}` : ''}${!b.active ? L(' · Inactiva', ' · Inactive') : ''}${b.overdue ? ` · <span class="neg">${b.overdue} ${L('vencida' + (b.overdue > 1 ? 's' : ''), 'overdue')}</span>` : ''}</div></div>
      <div class="amount num">${money(b.amount)}</div></button>`).join('')}</div>`
    : `<div class="glass">${empty({ ic: 'calendar', title: 'Sin facturas registradas', text: 'Agrega la renta, la luz, el internet o los seguros para ver tus próximos pagos y no olvidar ninguno.', action: '<button class="btn btn-primary" data-new>Agregar factura</button>' })}</div>`}
    ${hint('Al marcar una factura como pagada se registra el gasto una sola vez. Si ya lo registraste, puedes enlazarlo en lugar de crear otro.')}`;

  main.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.nav) { viewMonth = addMonths(viewMonth, Number(b.dataset.nav)); selected = null; return calendarView(main); }
    if (b.dataset.day !== undefined) { selected = b.dataset.day || null; return calendarView(main); }
    if (b.dataset.occ) { const o = items.concat(cal.overdueBefore).find((x) => x.id === b.dataset.occ); return o.status === 'paid' ? toast(`«${o.name}» ya está pagada.`) : openPayBill(o); }
    if (b.dataset.bill) return openBillForm(bills.find((x) => x.id === b.dataset.bill));
    if (b.hasAttribute('data-new')) return openBillForm(null, selected);
  };
}

export function openPayBill(o) {
  if (!o) return;
  const clientId = newClientId();
  const accs = activeAccounts();
  if (!accs.length) return toast('Agrega una cuenta antes de registrar pagos.', { error: true });
  const defAcc = account(o.account_id) && !account(o.account_id).archived ? o.account_id : accs[0].id;
  const s = sheet({
    title: `Pagar ${o.name}`,
    body: `<form class="stack" novalidate>
      <div class="glass card tight row between"><div><div class="small muted">Vence</div><b>${esc(fmtDate(o.due_date))}</b></div>
        <div style="text-align:right"><div class="small muted">Pendiente</div><b class="num">${money(o.remaining)}</b>${o.paid ? `<div class="tiny muted">de ${money(o.amount)} · pagado ${money(o.paid)}</div>` : ''}</div></div>
      <div class="field"><label for="pb-a">Importe pagado</label><input class="input num" id="pb-a" name="amount" inputmode="decimal" value="${centsToInput(o.remaining)}"></div>
      ${hint('Si pagas menos, queda como pago parcial y el resto sigue pendiente.')}
      <div class="grid-2"><div class="field"><label for="pb-c">Desde la cuenta</label><select class="input" id="pb-c" name="account_id">${accs.map((a) => `<option value="${a.id}" ${a.id === defAcc ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="pb-d">Fecha de pago</label><input class="input" id="pb-d" type="date" name="date" value="${today()}"></div></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('check')} Registrar pago</button>
      <details class="more"><summary>${icon('link')} Ya registré este gasto: enlazarlo</summary><div data-cands class="stack" style="margin-top:8px"><div class="small muted">Buscando gastos parecidos…</div></div></details>
    </form>`,
  });
  const form = s.el.querySelector('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const amount = parseMoney(form.amount.value);
        if (!amount || amount <= 0) throw Object.assign(new Error('Escribe un importe mayor que cero.'), { field: 'amount' });
        await post(H(`/occurrences/${o.id}/pay`), { amount, account_id: form.account_id.value, date: form.date.value, client_id: clientId });
        s.close();
        toast(amount < o.remaining ? `Pago parcial registrado. Quedan ${money(o.remaining - amount)}.` : `«${o.name}» marcada como pagada.`);
        await changed();
      } catch (err) { formError(form, err); }
    });
  };
  form.querySelector('details').addEventListener('toggle', async (e) => {
    if (!e.target.open || e.target.dataset.loaded) return;
    e.target.dataset.loaded = '1';
    const box = form.querySelector('[data-cands]');
    try {
      const list = await get(H(`/occurrences/${o.id}/candidates`));
      box.innerHTML = list.length ? list.map((t) => `<button type="button" class="item glass" data-link="${t.id}"><div class="grow"><div class="title ellipsis">${esc(t.description)}</div>
        <div class="sub">${fmtDate(t.date, { day: 'numeric', month: 'short' })} · ${esc(t.account_name)}</div></div><div class="amount num">${money(t.amount)}</div></button>`).join('')
        : '<div class="small muted">No encontramos gastos sin enlazar cerca de esta fecha.</div>';
    } catch (err) { box.innerHTML = `<div class="small neg">${esc(err.message)}</div>`; }
  });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-link]');
    if (!b) return;
    busy(b, async () => {
      try {
        await post(H(`/occurrences/${o.id}/pay`), { transaction_id: b.dataset.link });
        s.close(); toast('Gasto enlazado a la factura.'); await changed();
      } catch (err) { formError(form, err); }
    });
  });
}

function openBillForm(bill, date) {
  const accs = activeAccounts();
  const opt = (list, sel) => list.map(([v, n]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const s = sheet({
    title: bill ? 'Editar factura' : 'Nueva factura',
    body: `<form class="stack" novalidate>
      <div class="field"><label for="b-n">Nombre</label><input class="input" id="b-n" name="name" maxlength="80" placeholder="Ej. Electricidad" value="${esc(bill?.name || '')}" autofocus></div>
      <div class="grid-2"><div class="field"><label for="b-a">Importe</label><input class="input num" id="b-a" name="amount" inputmode="decimal" placeholder="0.00" value="${bill ? centsToInput(bill.amount) : ''}"></div>
        <div class="field"><label for="b-f">Frecuencia</label><select class="input" id="b-f" name="frequency">${opt(FREQ, bill?.frequency || 'monthly')}</select></div></div>
      <div class="grid-2"><div class="field"><label for="b-d">${bill ? 'Primer vencimiento' : 'Próximo vencimiento'}</label><input class="input" id="b-d" type="date" name="first_due" value="${bill?.first_due || date || today()}"></div>
        <div class="field"><label for="b-e">Hasta (opcional)</label><input class="input" id="b-e" type="date" name="end_date" value="${bill?.end_date || ''}"></div></div>
      <div class="grid-2"><div class="field"><label for="b-c">Cuenta de pago</label><select class="input" id="b-c" name="account_id"><option value="">Elegir al pagar</option>${opt(accs.map((a) => [a.id, a.name]), bill?.account_id)}</select></div>
        <div class="field"><label for="b-cat">Categoría</label><select class="input" id="b-cat" name="category_id"><option value="">Servicios (predeterminada)</option>${opt(catsOf('expense').map((c) => [c.id, c.name]), bill?.category_id)}</select></div></div>
      <div class="field"><label for="b-r">Recordatorio</label><select class="input" id="b-r" name="reminder_days">${opt([[0, 'El mismo día'], [1, '1 día antes'], [3, '3 días antes'], [7, '1 semana antes']].map(([v, n]) => [String(v), n]), String(bill?.reminder_days ?? 3))}</select></div>
      ${hint('Los recordatorios se muestran en Inicio y en este calendario. Las notificaciones push o por correo requieren configuración adicional del servidor.')}
      <div class="field"><label for="b-no">Notas</label><input class="input" id="b-no" name="notes" maxlength="500" value="${esc(bill?.notes || '')}"></div>
      ${bill ? `<label class="check"><input type="checkbox" name="active" ${bill.active ? 'checked' : ''}> Factura activa</label>` : ''}
      <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar</button>
      ${bill ? `<button type="button" class="btn btn-ghost btn-block" data-delete style="color:var(--neg)">${icon('trash')} Eliminar factura</button>` : ''}
    </form>`,
  });
  const form = s.el.querySelector('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const d = Object.fromEntries(new FormData(form));
        const amount = parseMoney(d.amount);
        if (!amount || amount <= 0) throw Object.assign(new Error('Escribe un importe mayor que cero.'), { field: 'amount' });
        const body = { name: d.name, amount, frequency: d.frequency, first_due: d.first_due, end_date: d.end_date || null, account_id: d.account_id || null,
          category_id: d.category_id || null, reminder_days: Number(d.reminder_days), notes: d.notes };
        if (bill) await patch(H(`/bills/${bill.id}`), { ...body, active: !!form.active?.checked });
        else await post(H('/bills'), body);
        s.close(); toast('Factura guardada.'); await changed();
      } catch (err) { formError(form, err); }
    });
  };
  form.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar factura', text: 'Se quitarán los vencimientos sin pagar. Los pagos ya registrados se conservan como movimientos.', confirm: 'Eliminar', danger: true });
    if (!ok) return;
    try { const r = await del(H(`/bills/${bill.id}`)); s.close(); toast(r.archived ? 'Factura desactivada; su historial de pagos se conserva.' : 'Factura eliminada.'); await changed(); }
    catch (err) { toast(err.message, { error: true }); }
  });
}
