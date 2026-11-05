// Formulario de movimiento: registrar un gasto cotidiano en pocos pasos, con detalles opcionales.
import { locale } from '../i18n.js';
import { get, post, patch, del, newClientId } from '../api.js';
import { S, H, catsOf, activeAccounts, account, category, changed, today } from '../store.js';
import { addPersonPrompt } from './people.js';
import { icon, esc, sheet, busy, formError, clearFormError, parseMoney, centsToInput, currencySymbol, catIcon, toast, confirmDialog, money, hint } from '../ui.js';

const TYPES = [['expense', 'Gasto'], ['income', 'Ingreso'], ['refund', 'Devolución'], ['transfer', 'Transferencia']];
const FREQ = [['', 'No se repite'], ['weekly', 'Cada semana'], ['biweekly', 'Cada 15 días (quincenal)'], ['monthly', 'Cada mes'], ['yearly', 'Cada año']];

const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } };
const usageKey = () => `jp-usage-${S.hid}`;
function bumpUsage(catId) { const u = store(usageKey()) || {}; u[catId] = (u[catId] || 0) + 1; store(usageKey(), u); }
function sortedCats(kind) {
  const u = store(usageKey()) || {};
  return catsOf(kind).slice().sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0) || a.sort - b.sort);
}

async function readReceipt(file) {
  if (!file) return null;
  if (file.type === 'application/pdf') {
    if (file.size > 2_000_000) throw new Error('El PDF es demasiado grande (máximo 2 MB).');
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  if (!file.type.startsWith('image/')) throw new Error('El comprobante debe ser una foto o un PDF.');
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

export async function openTxForm({ type = 'expense', id = null, preset = {} } = {}) {
  if (!activeAccounts().length) {
    toast('Primero agrega una cuenta en «Cuentas y tarjetas».', { action: 'Ir', onAction: () => { location.hash = '#/cuentas'; } });
    return;
  }
  let tx = null;
  if (id) {
    try { tx = await get(H(`/transactions/${id}`)); } catch (e) { toast(e.message, { error: true }); return; }
    type = tx.type;
  }
  const clientId = newClientId();
  const last = store(`jp-last-acc-${S.hid}`);
  const accs = activeAccounts();
  const defAcc = tx?.account_id || preset.account_id || (account(last) && !account(last).archived ? last : accs[0].id);
  const accOpts = (sel, includeArchived) => S.accounts.filter((a) => !a.archived || a.id === sel || includeArchived)
    .map((a) => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)}${a.archived ? ' (archivada)' : ''}</option>`).join('');
  const memberOpts = (sel) => S.members.map((m) => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.name)}${m.id === S.me.user.id ? ' (tú)' : ''}</option>`).join('')
    + '<option value="__new">+ Agregar un nombre…</option>';
  const state = {
    type,
    category: tx?.splits?.length === 1 ? tx.splits[0].category_id : (preset.category_id || null),
    splits: tx?.splits?.length > 1 ? tx.splits.map((s) => ({ ...s })) : null,
    receipt: undefined,
  };

  const s = sheet({
    title: tx ? 'Editar movimiento' : 'Nuevo movimiento',
    body: `<form class="stack" novalidate>
      <div class="seg" role="group" aria-label="Tipo de movimiento">${TYPES.map(([v, n]) => `<button type="button" data-type="${v}" aria-pressed="${v === type}">${n}</button>`).join('')}</div>
      <div class="amount-wrap"><span class="cur">${esc(currencySymbol())}</span>
        <input class="input amount-input num" name="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" aria-label="Importe" value="${tx ? centsToInput(tx.amount) : (preset.amount ? centsToInput(preset.amount) : '')}" autofocus></div>
      <div data-cats></div>
      <div class="grid-2">
        <div class="field"><label for="tx-acc" data-acc-label>Cuenta</label><select class="input" id="tx-acc" name="account_id">${accOpts(defAcc)}</select></div>
        <div class="field" data-to><label for="tx-to">Hacia la cuenta</label><select class="input" id="tx-to" name="to_account_id">${accOpts(tx?.to_account_id || preset.to_account_id || accs.find((a) => a.id !== defAcc)?.id)}</select></div>
        <div class="field" data-date><label for="tx-date">Fecha</label><input class="input" id="tx-date" type="date" name="date" value="${tx?.date || preset.date || today()}" required></div>
      </div>
      <div class="field"><label for="tx-desc">Descripción</label><input class="input" id="tx-desc" name="description" maxlength="140" placeholder="Se usa la categoría si lo dejas vacío" value="${esc(tx?.description || preset.description || '')}"></div>
      <details class="more" ${tx && (tx.merchant || tx.notes || tx.tags?.length || tx.has_receipt || state.splits) ? 'open' : ''}><summary>${icon('chevdown')} Más detalles</summary>
        <div class="stack" style="margin-top:10px">
          <div class="field"><label for="tx-mem">Integrante</label><select class="input" id="tx-mem" name="member_id">${memberOpts(tx?.member_id || S.me.user.id)}</select></div>
          <div class="field"><label for="tx-mer">Comercio</label><input class="input" id="tx-mer" name="merchant" maxlength="100" value="${esc(tx?.merchant || '')}"></div>
          <div class="field"><label for="tx-tags">Etiquetas</label><input class="input" id="tx-tags" name="tags" placeholder="Separadas por comas: escuela, viaje" value="${esc((tx?.tags || []).join(', '))}"></div>
          <div class="field"><label for="tx-notes">Notas</label><textarea class="input" id="tx-notes" name="notes" maxlength="1000">${esc(tx?.notes || '')}</textarea></div>
          <div class="field"><label for="tx-rec">Comprobante (foto o PDF)</label>
            <input class="input" id="tx-rec" type="file" accept="image/*,application/pdf">
            ${tx?.has_receipt ? `<div class="row small"><button type="button" class="link-btn" data-view-receipt>${icon('eye')} Ver comprobante</button><button type="button" class="link-btn" data-rm-receipt style="color:var(--neg)">Quitar</button></div>` : ''}</div>
          <div data-split-box></div>
          ${tx ? (tx.recurring_id ? hint('Este movimiento es parte de una serie recurrente. Los cambios aplican solo a este; la serie se gestiona en «Recurrentes».') : '') : `
          <div class="grid-2"><div class="field"><label for="tx-rep">Repetir</label><select class="input" id="tx-rep" name="frequency">${FREQ.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></div>
            <div class="field" data-end hidden><label for="tx-end">Hasta (opcional)</label><input class="input" id="tx-end" type="date" name="end_date"></div></div>`}
          ${tx ? `<div class="small muted">Registrado por ${esc(tx.created_by_name || 'exintegrante')} · ${new Date(tx.created_at).toLocaleString(locale())}${tx.bill ? ` · Pago de «${esc(tx.bill.name)}»` : ''}</div>` : ''}
        </div>
      </details>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${tx ? 'Guardar cambios' : 'Guardar'}</button>
      ${tx ? `<button type="button" class="btn btn-ghost btn-block" data-delete style="color:var(--neg)">${icon('trash')} Eliminar movimiento</button>` : ''}
    </form>`,
  });
  const form = s.el.querySelector('form');
  const $ = (sel) => form.querySelector(sel);

  function renderCats() {
    const box = $('[data-cats]');
    if (state.type === 'transfer') { box.innerHTML = hint('Las transferencias mueven dinero entre tus cuentas; no son gasto ni ingreso. Para pagar una tarjeta, transfiere desde tu banco hacia la tarjeta.'); return; }
    if (state.splits) { box.innerHTML = `<div class="chip">${icon('pie')} Compra dividida en ${state.splits.length} categorías</div>`; return; }
    const kind = state.type === 'income' ? 'income' : 'expense';
    const cats = sortedCats(kind);
    if (state.category && !cats.some((c) => c.id === state.category)) state.category = null;
    const shown = box.dataset.all ? cats : cats.slice(0, 8);
    if (state.category && !shown.some((c) => c.id === state.category)) shown.push(category(state.category));
    box.innerHTML = `<div class="label" style="margin-bottom:8px">Categoría</div><div class="chips" role="group" aria-label="Categoría">
      ${shown.map((c) => `<button type="button" class="cat-chip" data-cat="${c.id}" aria-pressed="${c.id === state.category}">${catIcon(c)}${esc(c.name)}</button>`).join('')}
      ${cats.length > 8 && !box.dataset.all ? `<button type="button" class="cat-chip" data-allcats>${icon('dots')} Ver todas</button>` : ''}</div>`;
  }
  function renderSplit() {
    const box = $('[data-split-box]');
    if (state.type === 'transfer') { box.innerHTML = ''; return; }
    if (!state.splits) { box.innerHTML = `<button type="button" class="btn btn-ghost btn-sm" data-split>${icon('pie')} Dividir entre categorías</button>`; return; }
    const kind = state.type === 'income' ? 'income' : 'expense';
    const opts = (sel) => catsOf(kind).map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    const total = parseMoney($('[name=amount]').value) || 0;
    const sum = state.splits.reduce((a, x) => a + (x.amount || 0), 0);
    box.innerHTML = `<div class="label">Dividir la compra</div>
      <div class="stack" style="gap:8px;margin-top:6px">${state.splits.map((x, i) => `<div class="split-row">
        <select class="input" data-si="${i}" data-k="category_id" aria-label="Categoría ${i + 1}"><option value="">Elige…</option>${opts(x.category_id)}</select>
        <input class="input num" data-si="${i}" data-k="amount" inputmode="decimal" placeholder="0.00" value="${x.amount ? centsToInput(x.amount) : ''}" aria-label="Importe ${i + 1}">
        <button type="button" class="icon-btn" data-rm-split="${i}" aria-label="Quitar">${icon('x')}</button></div>`).join('')}</div>
      <div class="row between small" style="margin-top:8px"><button type="button" class="link-btn" data-add-split>${icon('plus')} Agregar categoría</button>
        <span class="${sum === total ? 'pos' : 'neg'} num" data-split-sum>Asignado ${money(sum)} de ${money(total)}</span></div>
      <button type="button" class="link-btn" data-unsplit>Usar una sola categoría</button>`;
  }
  function renderType() {
    form.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.type === state.type));
    $('[data-to]').hidden = state.type !== 'transfer';
    $('[data-acc-label]').textContent = state.type === 'transfer' ? 'Desde la cuenta' : 'Cuenta';
    renderCats(); renderSplit();
  }
  renderType();

  form.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.type) {
      const prevKind = state.type === 'income' ? 'income' : state.type === 'transfer' ? 'transfer' : 'expense';
      state.type = t.dataset.type;
      const newKind = state.type === 'income' ? 'income' : state.type === 'transfer' ? 'transfer' : 'expense';
      if (prevKind !== newKind) { state.category = null; state.splits = null; }
      renderType();
    } else if (t.dataset.cat) { state.category = t.dataset.cat; renderCats(); }
    else if (t.hasAttribute('data-allcats')) { $('[data-cats]').dataset.all = '1'; renderCats(); }
    else if (t.hasAttribute('data-split')) {
      const total = parseMoney($('[name=amount]').value) || 0;
      state.splits = [{ category_id: state.category || '', amount: total }, { category_id: '', amount: 0 }];
      renderCats(); renderSplit();
    } else if (t.hasAttribute('data-add-split')) { state.splits.push({ category_id: '', amount: 0 }); renderSplit(); }
    else if (t.dataset.rmSplit !== undefined) { state.splits.splice(Number(t.dataset.rmSplit), 1); if (state.splits.length < 2) { state.category = state.splits[0]?.category_id || null; state.splits = null; renderCats(); } renderSplit(); }
    else if (t.hasAttribute('data-unsplit')) { state.category = state.splits[0]?.category_id || null; state.splits = null; renderCats(); renderSplit(); }
    else if (t.hasAttribute('data-view-receipt')) {
      try {
        const r = await get(H(`/transactions/${tx.id}/receipt`));
        const isPdf = r.data.startsWith('data:application/pdf');
        sheet({ title: 'Comprobante', body: isPdf ? `<a class="btn btn-block" href="${r.data}" download="comprobante.pdf">${icon('download')} Descargar PDF</a>` : `<img src="${r.data}" alt="Comprobante" style="width:100%;border-radius:16px">` });
      } catch (err) { toast(err.message, { error: true }); }
    } else if (t.hasAttribute('data-rm-receipt')) { state.receipt = null; t.closest('.row').innerHTML = '<span class="small muted">Se quitará al guardar.</span>'; }
    else if (t.hasAttribute('data-delete')) {
      const ok = await confirmDialog({ title: 'Eliminar movimiento', text: `Se eliminará «${esc(tx.description)}» por ${money(tx.amount)}. Podrás deshacerlo durante unos segundos.`, confirm: 'Eliminar', danger: true });
      if (!ok) return;
      try {
        await del(H(`/transactions/${tx.id}`));
        s.close(); await changed();
        toast('Movimiento eliminado.', { action: 'Deshacer', onAction: async () => { await post(H(`/transactions/${tx.id}/restore`)); await changed(); toast('Movimiento recuperado.'); } });
      } catch (err) { toast(err.message, { error: true }); }
    }
  });
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.si !== undefined) {
      const sp = state.splits[Number(t.dataset.si)];
      if (t.dataset.k === 'amount') sp.amount = parseMoney(t.value) || 0; else sp.category_id = t.value;
      const total = parseMoney($('[name=amount]').value) || 0, sum = state.splits.reduce((a, x) => a + (x.amount || 0), 0);
      const lab = $('[data-split-sum]'); lab.textContent = `Asignado ${money(sum)} de ${money(total)}`; lab.className = `${sum === total ? 'pos' : 'neg'} num`;
    }
    if (t.name === 'amount' && state.splits) { const lab = $('[data-split-sum]'); if (lab) { const total = parseMoney(t.value) || 0, sum = state.splits.reduce((a, x) => a + (x.amount || 0), 0); lab.textContent = `Asignado ${money(sum)} de ${money(total)}`; lab.className = `${sum === total ? 'pos' : 'neg'} num`; } }
  });
  form.addEventListener('change', async (e) => {
    if (e.target.name === 'frequency') $('[data-end]').hidden = !e.target.value;
    if (e.target.name === 'member_id' && e.target.value === '__new') {
      const sel = e.target;
      const id = await addPersonPrompt();
      sel.innerHTML = memberOpts(id || S.me.user.id);
    }
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const f = Object.fromEntries(new FormData(form));
        const amount = parseMoney(f.amount);
        if (!amount || amount <= 0) throw Object.assign(new Error('Escribe un importe mayor que cero.'), { field: 'amount' });
        if (!f.date) throw Object.assign(new Error('Elige una fecha.'), { field: 'date' });
        const body = {
          type: state.type, amount, date: f.date, account_id: f.account_id, member_id: f.member_id,
          merchant: f.merchant, notes: f.notes, tags: (f.tags || '').split(',').map((x) => x.trim()).filter(Boolean),
        };
        if (state.type === 'transfer') {
          body.to_account_id = f.to_account_id;
          body.description = f.description?.trim() || `Transferencia a ${account(f.to_account_id)?.name || 'otra cuenta'}`;
        } else if (state.splits) {
          if (state.splits.some((x) => !x.category_id || !x.amount)) throw new Error('Completa la categoría y el importe de cada división.');
          body.splits = state.splits.map((x) => ({ category_id: x.category_id, amount: x.amount }));
          body.description = f.description?.trim() || 'Compra dividida';
        } else {
          if (!state.category) throw new Error('Elige una categoría.');
          body.category_id = state.category;
          body.description = f.description?.trim() || category(state.category)?.name || 'Movimiento';
        }
        const file = form.querySelector('#tx-rec').files[0];
        if (file) body.receipt = await readReceipt(file);
        else if (state.receipt === null) body.receipt = null;
        if (!tx && f.frequency) body.repeat = { frequency: f.frequency, end_date: f.end_date || null };
        if (tx) await patch(H(`/transactions/${tx.id}`), body);
        else await post(H('/transactions'), { ...body, client_id: clientId });
        store(`jp-last-acc-${S.hid}`, f.account_id);
        if (body.category_id) bumpUsage(body.category_id);
        s.close();
        toast(tx ? 'Cambios guardados.' : `${TYPES.find((x) => x[0] === state.type)[1]} de ${money(amount)} registrado.`);
        await changed();
      } catch (err) { formError(form, err); }
    });
  };
  return s;
}
