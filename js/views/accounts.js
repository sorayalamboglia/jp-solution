// Cuentas y tarjetas: efectivo, bancos, ahorros y crédito; saldos, límites y fechas.
import { patch, post, del } from '../api.js';
import { S, H, isAdmin, changed, today, refreshRefs } from '../store.js';

const GROUP_NAMES = { bank: 'Cuentas bancarias', cash: 'Efectivo', savings: 'Ahorros', credit: 'Tarjetas de crédito' };
import { icon, esc, money, progress, hint, empty, sheet, busy, formError, clearFormError, parseMoney, centsToInput, toast, confirmDialog, fmtDate } from '../ui.js';
import { ACCOUNT_TYPES } from './common.js';
import { openTxForm } from './txform.js';

export async function accountsView(main) {
  await refreshRefs();
  const accs = S.accounts;
  const active = accs.filter((a) => !a.archived);
  const assets = active.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
  const owed = active.filter((a) => a.type === 'credit').reduce((s, a) => s + (a.owed || 0), 0);
  const groups = ['bank', 'cash', 'savings', 'credit'].map((t) => [t, active.filter((a) => a.type === t)]).filter(([, l]) => l.length);

  main.innerHTML = `
    <section class="glass hero" style="margin-top:6px">
      <div class="hero-icon">${icon('bank')}</div>
      <div style="color:var(--ink-2);font-weight:500">Patrimonio en cuentas</div>
      <div class="big num ${assets - owed < 0 ? 'neg' : ''}">${money(assets - owed)}</div>
      <div class="grid-2 small" style="position:relative;z-index:1"><div>Disponible<br><b class="num">${money(assets)}</b></div><div>Deuda en tarjetas<br><b class="num">${money(owed)}</b></div></div>
      ${hint('Disponible = efectivo + bancos + ahorros. Deuda en tarjetas = saldo pendiente de todas las tarjetas.')}
    </section>
    ${groups.map(([t, list]) => `<div class="section-title"><span>${GROUP_NAMES[t]}</span></div>
      <div class="grid cols-2">${list.map(card).join('')}</div>`).join('')}
    ${!active.length ? `<div class="glass" style="margin-top:14px">${empty({ ic: 'wallet', title: 'Sin cuentas activas', text: 'Agrega tu efectivo, tu cuenta bancaria, tus ahorros o tus tarjetas con el saldo que tienen hoy.' })}</div>` : ''}
    ${isAdmin() ? `<button class="btn btn-primary btn-block" style="margin-top:16px" data-new>${icon('plus')} Agregar cuenta o tarjeta</button>` : hint('Solo un administrador del hogar puede crear o editar cuentas.')}
    ${accs.some((a) => a.archived) ? `<details class="more" style="margin-top:16px"><summary>Cuentas archivadas (${accs.filter((a) => a.archived).length})</summary>
      <div class="grid cols-2" style="margin-top:8px">${accs.filter((a) => a.archived).map(card).join('')}</div></details>` : ''}`;

  main.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-new')) return openAccountForm();
    if (b.dataset.edit) return openAccountForm(accs.find((a) => a.id === b.dataset.edit));
    if (b.dataset.pay) {
      const card = accs.find((a) => a.id === b.dataset.pay);
      const from = active.find((a) => a.type === 'bank') || active.find((a) => a.type !== 'credit');
      return openTxForm({ type: 'transfer', preset: { account_id: from?.id, to_account_id: card.id, amount: card.owed || undefined, description: `Pago de ${card.name}` } });
    }
  };
}

function card(a) {
  const [label, ic, color] = ACCOUNT_TYPES[a.type];
  const used = a.type === 'credit' && a.credit_limit ? (a.owed / a.credit_limit) * 100 : 0;
  return `<div class="glass card" ${a.archived ? 'style="opacity:.65"' : ''}>
    <div class="row"><span class="cat-icon" style="color:${esc(a.color || color)}">${icon(ic)}</span>
      <div class="grow"><div style="font-weight:600" class="ellipsis">${esc(a.name)}</div><div class="small muted">${label}${a.archived ? ' · Archivada' : ''}</div></div>
      <div style="text-align:right">${a.type === 'credit'
        ? `<div class="small muted">Saldo pendiente</div><div class="num" style="font-weight:650;font-size:1.15rem">${money(a.owed)}</div>`
        : `<div class="num ${a.balance < 0 ? 'neg' : ''}" style="font-weight:650;font-size:1.15rem">${money(a.balance)}</div>`}</div></div>
    ${a.type === 'credit' ? `
      ${a.credit_limit ? `<div style="margin:12px 0 6px">${progress(used, used > 90 ? 'over' : used > 70 ? 'warn' : 'lav')}</div>
        <div class="row between small"><span>Límite <b class="num">${money(a.credit_limit)}</b></span><span>Disponible <b class="num ${a.available < 0 ? 'neg' : ''}">${money(a.available)}</b></span></div>` : ''}
      <div class="row between small muted" style="margin-top:6px"><span>${a.next_cut ? `Corte: ${esc(fmtDate(a.next_cut, { day: 'numeric', month: 'short' }))}` : 'Sin fecha de corte'}</span>
        <span>${a.next_pay ? `Pago: ${esc(fmtDate(a.next_pay, { day: 'numeric', month: 'short' }))}` : 'Sin fecha de pago'}</span></div>` : ''}
    <div class="row wrap" style="margin-top:12px;gap:8px">
      <a class="btn btn-sm" href="#/movimientos?account=${a.id}">${icon('list')} Movimientos (${a.tx_count})</a>
      ${a.type === 'credit' && !a.archived ? `<button class="btn btn-sm" data-pay="${a.id}">${icon('swap')} Pagar tarjeta</button>` : ''}
      ${isAdmin() ? `<button class="btn btn-sm btn-ghost" data-edit="${a.id}">${icon('edit')} Editar</button>` : ''}
    </div></div>`;
}

function openAccountForm(a) {
  const type = a?.type || 'bank';
  const isCredit = (t) => t === 'credit';
  const opening = a ? (isCredit(a.type) ? -a.opening_balance : a.opening_balance) : null;
  const dayOpts = (sel) => `<option value="">—</option>` + Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${i + 1 === sel ? 'selected' : ''}>${i + 1}</option>`).join('');
  const s = sheet({
    title: a ? 'Editar cuenta' : 'Nueva cuenta o tarjeta',
    body: `<form class="stack" novalidate>
      <div class="field"><label for="a-n">Nombre</label><input class="input" id="a-n" name="name" maxlength="60" placeholder="Ej. Banco Nacional" value="${esc(a?.name || '')}" autofocus></div>
      <div class="field"><label for="a-t">Tipo</label><select class="input" id="a-t" name="type" ${a ? 'disabled' : ''}>${Object.entries(ACCOUNT_TYPES).map(([k, [n]]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="grid-2"><div class="field"><label for="a-b" data-bal-label>${isCredit(type) ? 'Lo que debes a esa fecha' : 'Saldo inicial'}</label><input class="input num" id="a-b" name="opening" inputmode="decimal" placeholder="0.00" value="${opening != null ? centsToInput(opening) : ''}"></div>
        <div class="field"><label for="a-d">Fecha del saldo</label><input class="input" id="a-d" type="date" name="opening_date" value="${a?.opening_date || today()}"></div></div>
      ${hint('El saldo de la cuenta se calcula así: saldo inicial + ingresos y devoluciones − gastos ± transferencias, desde la fecha del saldo inicial.')}
      <div class="stack" data-credit ${isCredit(type) ? '' : 'hidden'}>
        <div class="field"><label for="a-l">Límite de crédito</label><input class="input num" id="a-l" name="credit_limit" inputmode="decimal" placeholder="0.00" value="${a?.credit_limit != null ? centsToInput(a.credit_limit) : ''}"></div>
        <div class="grid-2"><div class="field"><label for="a-c">Día de corte</label><select class="input" id="a-c" name="cut_day">${dayOpts(a?.cut_day)}</select></div>
          <div class="field"><label for="a-p">Día de pago</label><select class="input" id="a-p" name="pay_day">${dayOpts(a?.pay_day)}</select></div></div>
        ${hint('Las compras con tarjeta se registran como gasto el día de la compra. El pago de la tarjeta es una transferencia desde tu banco: no se cuenta dos veces.')}
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar</button>
      ${a ? `<div class="grid-2"><button type="button" class="btn" data-archive>${a.archived ? 'Reactivar' : 'Archivar'}</button>
        <button type="button" class="btn btn-ghost" data-delete style="color:var(--neg)">${icon('trash')} Eliminar</button></div>
        ${hint('Archivar oculta la cuenta pero conserva su historial. Solo se pueden eliminar cuentas sin movimientos.')}` : ''}
    </form>`,
  });
  const form = s.el.querySelector('form');
  form.type.onchange = () => {
    form.querySelector('[data-credit]').hidden = !isCredit(form.type.value);
    form.querySelector('[data-bal-label]').textContent = isCredit(form.type.value) ? 'Lo que debes a esa fecha' : 'Saldo inicial';
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const t = a?.type || form.type.value;
        const raw = form.opening.value.trim();
        const allowNeg = raw.startsWith('-');
        let cents = raw ? parseMoney(raw) : 0;
        if (Number.isNaN(cents)) throw Object.assign(new Error('Escribe un saldo válido.'), { field: 'opening' });
        if (allowNeg) cents = -cents;
        const limit = form.credit_limit.value.trim() ? parseMoney(form.credit_limit.value) : null;
        if (Number.isNaN(limit)) throw new Error('Escribe un límite válido.');
        const body = { name: form.name.value, type: t, opening_balance: isCredit(t) ? -cents : cents, opening_date: form.opening_date.value,
          credit_limit: isCredit(t) ? limit : undefined, cut_day: isCredit(t) && form.cut_day.value ? Number(form.cut_day.value) : null, pay_day: isCredit(t) && form.pay_day.value ? Number(form.pay_day.value) : null };
        if (a) await patch(H(`/accounts/${a.id}`), body); else await post(H('/accounts'), body);
        s.close(); toast('Cuenta guardada.'); await changed();
      } catch (err) { formError(form, err); }
    });
  };
  form.querySelector('[data-archive]')?.addEventListener('click', async () => {
    try { await patch(H(`/accounts/${a.id}`), { archived: !a.archived }); s.close(); toast(a.archived ? 'Cuenta reactivada.' : 'Cuenta archivada.'); await changed(); }
    catch (err) { formError(form, err); }
  });
  form.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar cuenta', text: `Se eliminará «${esc(a.name)}». Esta acción no se puede deshacer.`, confirm: 'Eliminar', danger: true });
    if (!ok) return;
    try { await del(H(`/accounts/${a.id}`)); s.close(); toast('Cuenta eliminada.'); await changed(); } catch (err) { toast(err.message, { error: true }); }
  });
}
