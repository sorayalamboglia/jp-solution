// Metas de ahorro: aportaciones, retiros, integrantes y aclaración de dónde está el dinero.
import { get, post, patch, del, newClientId } from '../api.js';
import { S, H, activeAccounts, account, member, changed, today } from '../store.js';
import { icon, esc, money, progress, hint, empty, skeleton, sheet, busy, formError, clearFormError, parseMoney, centsToInput, toast, confirmDialog, avatar, fmtDate } from '../ui.js';
import { debtsView } from './more.js';
import { L } from '../i18n.js';

const GOAL_ICONS = [['home', '#5aa9f5'], ['shield', '#3cc4a0'], ['plane', '#8b7cf6'], ['school', '#f2a65a'], ['car', '#60c3d8'], ['gift', '#f28bb6'], ['piggy', '#7c8cf8'], ['heart', '#e879a8']];
let tab = 'goals';

export async function goalsView(main, params) {
  if (params.tab) tab = params.tab;
  main.innerHTML = `<div class="seg" role="group" aria-label="Sección" style="margin:6px 0 14px;max-width:360px">
    <button data-tab="goals" aria-pressed="${tab === 'goals'}">Metas de ahorro</button><button data-tab="debts" aria-pressed="${tab === 'debts'}">Deudas</button></div><div data-body>${skeleton(110, 3)}</div>`;
  main.querySelector('.seg').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; goalsView(main, {}); } };
  const body = main.querySelector('[data-body]');
  if (tab === 'debts') return debtsView(body);
  const goals = await get(H('/goals'));
  const active = goals.filter((g) => !g.archived);
  const accountSaved = active.filter((g) => g.mode === 'account').reduce((s, g) => s + g.saved, 0);
  const tracked = active.filter((g) => g.mode === 'tracking').reduce((s, g) => s + g.saved, 0);

  body.innerHTML = `
    ${active.length ? `<section class="glass card" style="margin-bottom:14px">
      <div class="grid-2"><div><div class="small muted">Apartado en cuentas</div><div class="num" style="font-size:1.35rem;font-weight:650">${money(accountSaved)}</div></div>
        <div><div class="small muted">Solo seguimiento</div><div class="num" style="font-size:1.35rem;font-weight:650">${money(tracked)}</div></div></div>
      ${hint('«Apartado en cuentas» es dinero que está en una cuenta dedicada a la meta. «Solo seguimiento» registra lo que reservas mentalmente, pero el dinero sigue en tus otras cuentas y no se suma de nuevo.')}
    </section>` : ''}
    ${active.length ? `<div class="grid cols-2">${active.map(goalCard).join('')}</div>`
      : `<div class="glass">${empty({ ic: 'target', title: 'Crea tu primera meta', text: 'La casa, unas vacaciones, la educación de los hijos o un fondo de emergencia. Define cuánto y para cuándo.', action: '<button class="btn btn-primary" data-new>Nueva meta</button>' })}</div>`}
    ${active.length ? `<button class="btn btn-primary btn-block" style="margin-top:16px" data-new>${icon('plus')} Nueva meta</button>` : ''}
    ${goals.some((g) => g.archived) ? `<details class="more" style="margin-top:14px"><summary>Metas archivadas (${goals.filter((g) => g.archived).length})</summary><div class="grid cols-2" style="margin-top:8px">${goals.filter((g) => g.archived).map(goalCard).join('')}</div></details>` : ''}`;

  body.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-new')) return openGoalForm();
    if (b.dataset.goal) return openGoal(goals.find((g) => g.id === b.dataset.goal));
  };
}

function goalCard(g) {
  const reached = g.saved >= g.target;
  return `<button class="glass item" style="display:block;padding:16px" data-goal="${g.id}" aria-label="${esc(g.name)}: ${g.pct} %">
    <div class="row"><div class="cat-icon" style="color:${esc(g.color)}">${icon(g.icon)}</div>
      <div class="grow"><div class="title">${esc(g.name)}</div><div class="sub num">${money(g.saved)} de ${money(g.target)}</div></div>
      <b class="num">${g.pct} %</b></div>
    <div style="margin:12px 0 10px">${progress(g.pct, g.mode === 'account' ? '' : 'lav')}</div>
    <div class="row wrap" style="gap:6px">
      ${g.mode === 'account' ? `<span class="chip ice">${icon('bank')} ${L('En', 'In')} ${esc(account(g.account_id)?.name || L('cuenta', 'account'))}</span>` : `<span class="chip">${icon('eye')} Solo seguimiento</span>`}
      ${reached ? `<span class="chip mint">${icon('check')} ¡Meta alcanzada!</span>` : g.target_date ? `<span class="chip gray">${icon('calendar')} ${esc(fmtDate(g.target_date, { month: 'short', year: 'numeric' }))}</span>` : ''}
      <span class="row" style="gap:2px;margin-left:auto">${g.members.map((id) => avatar(member(id))).join('')}</span>
    </div>
    ${g.monthlyNeeded ? `<div class="hint">Para llegar a tiempo: ${money(g.monthlyNeeded)} al mes. Supuesto: aportes iguales cada mes y sin intereses.</div>` : ''}
  </button>`;
}

function openGoal(g) {
  const s = sheet({
    title: g.name,
    body: `<div class="stack">
      <div class="glass card tight"><div class="row between"><div><div class="small muted">Ahorrado</div><div class="num" style="font-size:1.5rem;font-weight:650">${money(g.saved)}</div></div>
        <div style="text-align:right"><div class="small muted">Objetivo</div><div class="num" style="font-weight:650">${money(g.target)}</div><div class="tiny muted">Faltan ${money(Math.max(0, g.target - g.saved))}</div></div></div>
        <div style="margin-top:10px">${progress(g.pct, g.mode === 'account' ? '' : 'lav')}</div>
        ${g.mode === 'account' ? hint(`El avance es el saldo actual de «${esc(account(g.account_id)?.name || 'la cuenta')}». Aportar o retirar registra una transferencia entre tus cuentas.`) : hint('Meta de seguimiento: las aportaciones no mueven dinero entre cuentas.')}</div>
      ${g.archived ? '' : `<div class="grid-2"><button class="btn btn-primary" data-entry="1">${icon('plus')} Aportar</button><button class="btn" data-entry="-1">${icon('minus')} Retirar</button></div>`}
      <div class="label">Historial</div>
      ${g.entries.length ? `<div class="list">${g.entries.map((e) => `<div class="glass item" style="cursor:default">
        <div class="grow"><div class="title num ${e.amount < 0 ? 'neg' : 'pos'}">${money(e.amount, { sign: true })}</div>
          <div class="sub">${esc(fmtDate(e.date))} · ${esc(member(e.member_id)?.name || 'Exintegrante')}${e.note ? ' · ' + esc(e.note) : ''}${e.transaction_id ? ' · con transferencia' : ''}</div></div>
        <button class="icon-btn" data-rm="${e.id}" aria-label="Eliminar registro">${icon('trash')}</button></div>`).join('')}</div>`
        : `<p class="small muted">${g.mode === 'account' ? 'Aún no hay aportaciones registradas desde la app. El avance usa el saldo actual de la cuenta.' : 'Aún no hay aportaciones.'}</p>`}
      <div class="grid-2"><button class="btn" data-edit>${icon('edit')} Editar</button><button class="btn" data-archive>${g.archived ? 'Reactivar' : 'Archivar'}</button></div>
      <button class="btn btn-ghost btn-block" data-delete style="color:var(--neg)">${icon('trash')} Eliminar meta</button>
    </div>`,
  });
  s.el.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.entry) { s.close(); return openEntry(g, Number(b.dataset.entry)); }
    if (b.hasAttribute('data-edit')) { s.close(); return openGoalForm(g); }
    if (b.hasAttribute('data-archive')) {
      try { await patch(H(`/goals/${g.id}`), { archived: !g.archived }); s.close(); toast(g.archived ? 'Meta reactivada.' : 'Meta archivada.'); await changed(); } catch (err) { toast(err.message, { error: true }); }
    }
    if (b.dataset.rm) {
      const ok = await confirmDialog({ title: 'Eliminar registro', text: g.mode === 'account' ? 'También se eliminará la transferencia asociada y los saldos volverán a como estaban.' : 'Se quitará del historial de la meta.', confirm: 'Eliminar', danger: true });
      if (!ok) return;
      try { await del(H(`/goals/${g.id}/entries/${b.dataset.rm}`)); s.close(); toast('Registro eliminado.'); await changed(); } catch (err) { toast(err.message, { error: true }); }
    }
    if (b.hasAttribute('data-delete')) {
      const ok = await confirmDialog({ title: 'Eliminar meta', text: `Se eliminará «${esc(g.name)}» y su historial. Las transferencias ya registradas entre cuentas se conservan.`, confirm: 'Eliminar', danger: true });
      if (!ok) return;
      try { await del(H(`/goals/${g.id}`)); s.close(); toast('Meta eliminada.'); await changed(); } catch (err) { toast(err.message, { error: true }); }
    }
  };
}

function openEntry(g, dir) {
  const clientId = newClientId();
  const others = activeAccounts().filter((a) => a.id !== g.account_id && a.type !== 'credit');
  const s = sheet({
    title: dir > 0 ? `Aportar a ${g.name}` : `Retirar de ${g.name}`,
    body: `<form class="stack" novalidate>
      <div class="amount-wrap"><input class="input amount-input num" name="amount" inputmode="decimal" placeholder="0.00" aria-label="Importe" autofocus></div>
      ${g.mode === 'account' ? `<div class="field"><label for="ge-a">${dir > 0 ? 'Desde la cuenta' : 'Hacia la cuenta'}</label><select class="input" id="ge-a" name="from_account_id">${others.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
        ${hint(`Se registrará una transferencia ${dir > 0 ? 'hacia' : 'desde'} «${esc(account(g.account_id)?.name || '')}». No cuenta como gasto.`)}` : ''}
      <div class="grid-2"><div class="field"><label for="ge-d">Fecha</label><input class="input" id="ge-d" type="date" name="date" value="${today()}"></div>
        <div class="field"><label for="ge-m">Integrante</label><select class="input" id="ge-m" name="member_id">${S.members.map((m) => `<option value="${m.id}" ${m.id === S.me.user.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="ge-n">Nota (opcional)</label><input class="input" id="ge-n" name="note" maxlength="140"></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${dir > 0 ? 'Aportar' : 'Retirar'}</button></form>`,
  });
  const form = s.el.querySelector('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const amount = parseMoney(form.amount.value);
        if (!amount || amount <= 0) throw Object.assign(new Error('Escribe un importe mayor que cero.'), { field: 'amount' });
        if (g.mode === 'account' && !others.length) throw new Error('Necesitas otra cuenta (no de crédito) para mover el dinero.');
        const d = Object.fromEntries(new FormData(form));
        await post(H(`/goals/${g.id}/entries`), { amount: dir * amount, date: d.date, note: d.note, member_id: d.member_id, from_account_id: d.from_account_id, client_id: clientId });
        s.close(); toast(dir > 0 ? `Aportaste ${money(amount)} a «${g.name}».` : `Retiraste ${money(amount)} de «${g.name}».`); await changed();
      } catch (err) { formError(form, err); }
    });
  };
}

function openGoalForm(g) {
  const accs = activeAccounts().filter((a) => a.type !== 'credit');
  const savings = accs.find((a) => a.type === 'savings');
  const sel = { icon: g?.icon || 'piggy', color: g?.color || '#7c8cf8' };
  const s = sheet({
    title: g ? 'Editar meta' : 'Nueva meta',
    body: `<form class="stack" novalidate>
      <div class="field"><label for="g-n">Nombre</label><input class="input" id="g-n" name="name" maxlength="60" placeholder="Ej. Vacaciones en familia" value="${esc(g?.name || '')}" autofocus></div>
      <div class="grid-2"><div class="field"><label for="g-t">Importe objetivo</label><input class="input num" id="g-t" name="target" inputmode="decimal" placeholder="0.00" value="${g ? centsToInput(g.target) : ''}"></div>
        <div class="field"><label for="g-d">Fecha objetivo (opcional)</label><input class="input" id="g-d" type="date" name="target_date" value="${g?.target_date || ''}"></div></div>
      <div class="label">Icono</div><div class="chips" data-icons>${GOAL_ICONS.map(([ic, c]) => `<button type="button" class="cat-chip" style="padding:7px" data-icon="${ic}" data-color="${c}" aria-pressed="${ic === sel.icon}" aria-label="${ic}"><span class="cat-icon" style="color:${c}">${icon(ic)}</span></button>`).join('')}</div>
      <div class="label">¿Dónde está el dinero?</div>
      <label class="check"><input type="radio" name="mode" value="tracking" ${g?.mode !== 'account' ? 'checked' : ''}> Solo seguimiento: el dinero sigue en mis cuentas normales</label>
      <label class="check"><input type="radio" name="mode" value="account" ${g?.mode === 'account' ? 'checked' : ''} ${accs.length ? '' : 'disabled'}> Apartado en una cuenta dedicada</label>
      <div class="field" data-acc ${g?.mode === 'account' ? '' : 'hidden'}><label for="g-a">Cuenta de la meta</label><select class="input" id="g-a" name="account_id">${accs.map((a) => `<option value="${a.id}" ${a.id === (g?.account_id || savings?.id) ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
        ${hint('El avance será el saldo de esa cuenta. Úsala solo para esta meta para no mezclar dinero.')}</div>
      <div class="label">Integrantes que participan</div>
      <div class="stack" style="gap:8px">${S.members.map((m) => `<label class="check"><input type="checkbox" name="members" value="${m.id}" ${(g ? g.members.includes(m.id) : true) ? 'checked' : ''}> ${avatar(m)} ${esc(m.name)}</label>`).join('')}</div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar meta</button></form>`,
  });
  const form = s.el.querySelector('form');
  form.addEventListener('change', (e) => { if (e.target.name === 'mode') form.querySelector('[data-acc]').hidden = e.target.value !== 'account'; });
  form.querySelector('[data-icons]').onclick = (e) => {
    const b = e.target.closest('[data-icon]'); if (!b) return;
    sel.icon = b.dataset.icon; sel.color = b.dataset.color;
    form.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const fd = new FormData(form);
        const target = parseMoney(fd.get('target'));
        if (!target || target <= 0) throw Object.assign(new Error('Escribe un importe objetivo mayor que cero.'), { field: 'target' });
        const body = { name: fd.get('name'), target, target_date: fd.get('target_date') || null, mode: fd.get('mode'), account_id: fd.get('account_id'),
          members: fd.getAll('members'), icon: sel.icon, color: sel.color };
        if (g) await patch(H(`/goals/${g.id}`), body); else await post(H('/goals'), body);
        s.close(); toast('Meta guardada.'); await changed();
      } catch (err) { formError(form, err); }
    });
  };
}
