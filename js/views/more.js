// Menú secundario y pantallas de configuración: hogar, integrantes, categorías, deudas, recurrentes y perfil.
import { get, post, patch, del, newClientId } from '../api.js';
import { S, H, isAdmin, selectHousehold, refreshHousehold, catsOf, activeAccounts, account, changed, today, loadMe } from '../store.js';
import { icon, ICONS, esc, money, hint, empty, skeleton, sheet, busy, formError, clearFormError, parseMoney, centsToInput, toast, confirmDialog, avatar, catIcon, fmtDate, download, closeAllSheets, progress, icsFile } from '../ui.js';
import { addPersonPrompt } from './people.js';
import { go } from '../nav.js';
import { getLang, setLang, L } from '../i18n.js';
import { LOCAL } from '../mode.js';
import { timezoneOptions, dayOptions } from './auth.js';
import { roleName } from './common.js';

// ---------- Menú ----------
export function openMenu() {
  const theme = (() => { try { return localStorage.getItem('jp-theme') || 'light'; } catch { return 'light'; } })();
  const solid = document.documentElement.classList.contains('reduce-transparency');
  const link = (href, ic, label) => `<a class="menu-item" href="#/${href}">${icon(ic)}<span>${label}</span></a>`;
  const s = sheet({
    title: 'Menú',
    body: `<div class="menu-grid">
      <div class="glass card tight">
        <div class="row">${avatar({ name: S.me.user.name, color: S.members.find((m) => m.id === S.me.user.id)?.color }, true)}<div class="grow"><b>${esc(S.me.user.name)}</b><div class="small muted ellipsis">${LOCAL ? esc(L('Datos guardados en este teléfono', 'Data stored on this phone')) : `${esc(S.me.user.email)} · ${roleName(S.role)}`}</div></div></div>
      </div>
      <div class="menu-group"><h4>Hogar activo</h4>
        ${S.me.households.map((h) => `<button class="menu-item" data-hh="${h.id}">${icon(h.is_demo ? 'sparkles' : 'family')}<span class="grow">${esc(h.name)}${h.is_demo ? ' <span class="chip amber">Demo</span>' : ''}</span>${h.id === S.hid ? icon('check') : ''}</button>`).join('')}
        <a class="menu-item" href="#/bienvenida">${icon('plus')}<span>${LOCAL ? 'Crear otro hogar' : 'Crear otro hogar o unirme'}</span></a>
      </div>
      <div class="menu-group"><h4>Finanzas</h4>
        ${link('cuentas', 'wallet', 'Cuentas y tarjetas')}${link('informes', 'chart', 'Informes')}${link('metas?tab=debts', 'debt', 'Deudas')}
        ${link('recurrentes', 'repeat', 'Movimientos recurrentes')}${link('categorias', 'tag', 'Categorías')}
      </div>
      <div class="menu-group"><h4>Datos</h4>${link('importar', 'upload', 'Importar movimientos (CSV)')}${link('respaldo', 'download', 'Respaldo, exportación y privacidad')}</div>
      <div class="menu-group"><h4>Configuración</h4>${link('hogar', 'users', LOCAL ? 'Hogar y nombres' : 'Hogar e integrantes')}${LOCAL ? link('seguridad', 'lock', 'Seguridad y bloqueo') : ''}${link('perfil', 'settings', 'Mi cuenta')}</div>
      <div class="menu-group"><h4>Idioma</h4><div class="seg" role="group" aria-label="Idioma" style="max-width:220px">${['es', 'en'].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${getLang() === l}">${l === 'es' ? 'Español' : 'English'}</button>`).join('')}</div></div>
      <div class="menu-group"><h4>Apariencia</h4>
        <div class="seg" role="group" aria-label="Tema">${[['light', 'Claro'], ['dark', 'Oscuro'], ['system', 'Del dispositivo']].map(([k, n]) => `<button data-theme="${k}" aria-pressed="${theme === k}">${n}</button>`).join('')}</div>
        <label class="check" style="margin-top:12px"><input type="checkbox" data-solid ${solid ? 'checked' : ''}> Reducir transparencia</label>
        <div class="hint">Si tu dispositivo pide reducir movimiento o transparencia, la app lo respeta automáticamente.</div>
      </div>
      ${LOCAL ? '' : `<button class="menu-item" data-logout style="color:var(--neg)">${icon('logout')}<span>Cerrar sesión</span></button>`}
    </div>`,
  });
  s.el.addEventListener('click', async (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.tagName === 'A') { s.close(); return; }
    if (b.dataset.hh) {
      if (b.dataset.hh === S.hid) return s.close();
      try { await selectHousehold(b.dataset.hh); s.close(); toast(`Ahora ves «${S.h.name}».`); go('inicio'); } catch (err) { toast(err.message, { error: true }); }
    }
    if (b.dataset.lang) { if (b.dataset.lang !== getLang()) setLang(b.dataset.lang); return; }
    if (b.dataset.theme) {
      try { localStorage.setItem('jp-theme', b.dataset.theme); } catch { /* sin almacenamiento */ }
      document.documentElement.setAttribute('data-theme', b.dataset.theme);
      s.el.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    }
    if (b.hasAttribute('data-logout')) {
      await post('/auth/logout').catch(() => {});
      S.me = null; S.hid = null; s.close(); go('entrar');
    }
  });
  s.el.querySelector('[data-solid]').onchange = (e) => {
    document.documentElement.classList.toggle('reduce-transparency', e.target.checked);
    try { localStorage.setItem('jp-solid', e.target.checked ? '1' : '0'); } catch { /* sin almacenamiento */ }
  };
}

// ---------- Hogar e integrantes ----------
export async function householdView(main) {
  await refreshHousehold();
  const admin = isAdmin();
  const h = S.h;
  main.innerHTML = `
    <section class="glass card" style="margin-top:6px">
      <h3>${icon('family')} Datos del hogar</h3>
      <form class="stack" data-hh-form novalidate>
        <div class="field"><label for="h-n">Nombre del hogar</label><input class="input" id="h-n" name="name" value="${esc(h.name)}" maxlength="60" ${admin ? '' : 'disabled'}></div>
        <div class="grid-2"><div class="field"><label>Moneda</label><input class="input" value="${L('Dólar estadounidense (USD)', 'US dollar (USD)')}" disabled><input type="hidden" name="currency" value="USD"></div>
          <div class="field"><label for="h-d">Inicio del mes</label><select class="input" id="h-d" name="start_day" ${admin ? '' : 'disabled'}>${dayOptions(h.start_day)}</select></div></div>
        <div class="field"><label for="h-t">Zona horaria</label><select class="input" id="h-t" name="timezone" ${admin ? '' : 'disabled'}>${timezoneOptions(h.timezone)}</select></div>
        ${admin ? '<button class="btn btn-primary" type="submit">Guardar cambios</button>' : hint('Solo un administrador puede cambiar estos datos.')}
      </form>
    </section>

    ${LOCAL ? '' : `<div class="section-title"><span>Integrantes con cuenta (${S.users.length})</span></div>
    <div class="list">${S.users.map((m) => `<div class="glass item" style="cursor:default">${avatar(m, true)}
      <div class="grow"><div class="title">${esc(m.name)}${m.id === S.me.user.id ? ' <span class="chip gray">Tú</span>' : ''}</div><div class="sub ellipsis">${esc(m.email)} · ${roleName(m.role)}</div></div>
      ${admin && m.id !== S.me.user.id ? `<button class="btn btn-sm" data-member="${m.id}">Gestionar</button>` : ''}</div>`).join('')}</div>`}

    <div class="section-title"><span>Nombres sin cuenta</span><button class="link-btn" data-add-person>${icon('plus')} Agregar nombre</button></div>
    ${S.people.filter((p) => !p.archived).length ? `<div class="list">${S.people.filter((p) => !p.archived).map((p) => `<div class="glass item" style="cursor:default">${avatar(p, true)}
      <div class="grow"><div class="title">${esc(p.name)}</div><div class="sub">Sin cuenta · se puede asignar a movimientos y metas</div></div>
      <button class="icon-btn" data-rm-person="${p.id}" aria-label="Quitar ${esc(p.name)}">${icon('trash')}</button></div>`).join('')}</div>`
      : `<div class="glass card small muted">Agrega a tus hijos u otras personas que no necesitan entrar a la app, para saber a quién corresponde cada gasto.</div>`}

    ${LOCAL ? '' : `<section class="glass card" style="margin-top:14px">
      <h3>Permisos</h3>
      <div class="small stack" style="gap:6px"><div><b>Administrador:</b> configura el hogar, invita o quita integrantes, administra cuentas, restaura respaldos y puede eliminar el hogar.</div>
        <div><b>Miembro:</b> ve los datos del hogar y registra o edita movimientos, presupuestos, facturas y metas.</div>
        <div class="muted">Cada movimiento guarda quién lo registró. Los datos pertenecen al hogar y solo sus integrantes pueden verlos.</div></div>
    </section>`}

    ${admin && !LOCAL ? `<section class="glass card" style="margin-top:14px">
      <h3>${icon('link')} Invitar a un integrante</h3>
      <form class="stack" data-invite>
        <div class="grid-2"><div class="field"><label for="i-l">Nombre (opcional)</label><input class="input" id="i-l" name="label" maxlength="60" placeholder="Ej. Mamá"></div>
          <div class="field"><label for="i-r">Permiso</label><select class="input" id="i-r" name="role"><option value="member">Miembro</option><option value="admin">Administrador</option></select></div></div>
        <button class="btn btn-primary" type="submit">Crear invitación</button>
        ${hint('Se genera un enlace de un solo uso que vence en 7 días. Compártelo por el medio que prefieras; la persona creará su propia cuenta.')}
      </form>
      <div data-inv-result></div>
      ${S.invites.length ? `<div class="label" style="margin-top:12px">Invitaciones pendientes</div><div class="stack" style="gap:8px;margin-top:6px">${S.invites.map((i) => `<div class="row small">
        <span class="grow"><b class="num">${esc(i.code)}</b>${i.label ? ' · ' + esc(i.label) : ''} · ${roleName(i.role)} · vence ${esc(fmtDate(i.expires_at.slice(0, 10), { day: 'numeric', month: 'short' }))}</span>
        <button class="link-btn" data-copy-inv="${esc(i.code)}">Copiar enlace</button><button class="link-btn" data-revoke="${esc(i.code)}" style="color:var(--neg)">Anular</button></div>`).join('')}</div>` : ''}
    </section>` : ''}

    <section class="glass card" style="margin-top:14px">
      <h3>Salir o eliminar</h3>
      <div class="stack">
        ${S.users.length > 1 && !LOCAL ? `<button class="btn" data-leave>${icon('logout')} Salir de este hogar</button>` : ''}
        ${admin ? `<button class="btn btn-ghost" data-delete-hh style="color:var(--neg)">${icon('trash')} Eliminar el hogar y todos sus datos</button>` : ''}
      </div>
    </section>`;

  const inviteLink = (code) => `${location.origin}/#/unirse?codigo=${code}`;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast('Enlace copiado.'); } catch { toast('No se pudo copiar. Selecciona el enlace y cópialo manualmente.', { error: true }); } };
  main.querySelector('[data-hh-form]').onsubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    busy(form.querySelector('[type=submit]'), async () => {
      try { const d = Object.fromEntries(new FormData(form)); await patch(H(), { ...d, start_day: Number(d.start_day) }); await loadMe(); await refreshHousehold(); toast('Hogar actualizado.'); householdView(main); }
      catch (err) { formError(form, err); }
    });
  };
  main.querySelector('[data-invite]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await post(H('/invites'), Object.fromEntries(new FormData(form)));
        const link = inviteLink(r.code);
        main.querySelector('[data-inv-result]').innerHTML = `<div class="glass card tight" style="margin-top:12px"><div class="small muted">Código</div><div class="num" style="font-size:1.3rem;font-weight:700;letter-spacing:.08em">${esc(r.code)}</div>
          <input class="input small" readonly value="${esc(link)}" aria-label="Enlace de invitación" style="margin:8px 0"><button class="btn btn-sm" data-copy-inv="${esc(r.code)}">${icon('copy')} Copiar enlace</button></div>`;
        await refreshHousehold();
      } catch (err) { formError(form, err); }
    });
  });
  main.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.copyInv) return copy(inviteLink(b.dataset.copyInv));
    if (b.dataset.revoke) { try { await del(H(`/invites/${b.dataset.revoke}`)); toast('Invitación anulada.'); householdView(main); } catch (err) { toast(err.message, { error: true }); } }
    if (b.dataset.member) return manageMember(S.users.find((m) => m.id === b.dataset.member), () => householdView(main));
    if (b.hasAttribute('data-add-person')) { if (await addPersonPrompt()) householdView(main); return; }
    if (b.dataset.rmPerson) {
      const p = S.people.find((x) => x.id === b.dataset.rmPerson);
      const ok = await confirmDialog({ title: 'Quitar nombre', text: `«${esc(p.name)}» ya no aparecerá en las listas. Sus movimientos conservan el nombre.`, confirm: 'Quitar', danger: true });
      if (!ok) return;
      try { await del(H(`/people/${p.id}`)); await refreshHousehold(); toast('Nombre quitado.'); householdView(main); } catch (err) { toast(err.message, { error: true }); }
    }
    if (b.hasAttribute('data-leave')) {
      const ok = await confirmDialog({ title: 'Salir del hogar', text: 'Dejarás de ver los datos de este hogar. Tus movimientos registrados se conservan para el resto de la familia.', confirm: 'Salir', danger: true });
      if (!ok) return;
      try { await del(H(`/members/${S.me.user.id}`)); await loadMe(); S.hid = null; toast('Saliste del hogar.'); go('inicio'); } catch (err) { toast(err.message, { error: true }); }
    }
    if (b.hasAttribute('data-delete-hh')) {
      const v = await confirmDialog({ title: 'Eliminar hogar', text: `Se borrarán para siempre todas las cuentas, movimientos, presupuestos, facturas y metas de «${esc(h.name)}». Te recomendamos descargar un respaldo antes.`, confirm: 'Eliminar definitivamente', danger: true,
        input: h.is_demo ? null : { label: `Escribe «${h.name}» para confirmar` } });
      if (!v) return;
      try { await del(H(), { confirm: h.is_demo ? undefined : v }); await loadMe(); S.hid = null; toast('Hogar eliminado.'); go(S.me.households.length ? 'inicio' : 'bienvenida'); }
      catch (err) { toast(err.message, { error: true }); }
    }
  };
}

function manageMember(m, done) {
  const s = sheet({
    title: m.name,
    body: `<div class="stack"><div class="field"><label for="mm-r">Permiso</label><select class="input" id="mm-r"><option value="member" ${m.role === 'member' ? 'selected' : ''}>Miembro</option><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Administrador</option></select></div>
      <button class="btn btn-primary" data-save>Guardar</button><button class="btn btn-ghost" data-remove style="color:var(--neg)">Quitar del hogar</button>
      ${hint('Al quitar a alguien, sus movimientos se conservan y siguen mostrando quién los registró.')}</div>`,
  });
  s.el.querySelector('[data-save]').onclick = (e) => busy(e.currentTarget, async () => {
    try { await patch(H(`/members/${m.id}`), { role: s.el.querySelector('#mm-r').value }); s.close(); toast('Permiso actualizado.'); done(); } catch (err) { toast(err.message, { error: true }); }
  });
  s.el.querySelector('[data-remove]').onclick = async () => {
    const ok = await confirmDialog({ title: 'Quitar integrante', text: `${esc(m.name)} ya no podrá ver los datos del hogar.`, confirm: 'Quitar', danger: true });
    if (!ok) return;
    try { await del(H(`/members/${m.id}`)); s.close(); toast('Integrante quitado.'); done(); } catch (err) { toast(err.message, { error: true }); }
  };
}

// ---------- Categorías ----------
const COLORS = ['#7aa7f7', '#a78bfa', '#60c3d8', '#f49ac1', '#6fcf9f', '#f2b56b', '#f59e6b', '#c084fc', '#818cf8', '#fb923c', '#e879a8', '#94a3b8', '#34c38f', '#2fb3a0'];
export async function categoriesView(main) {
  const section = (kind, title) => {
    const list = S.categories.filter((c) => c.kind === kind);
    return `<div class="section-title"><span>${title}</span><button class="link-btn" data-new="${kind}">${icon('plus')} Nueva</button></div>
      <div class="grid cols-2">${list.map((c) => `<button class="glass item" data-cat="${c.id}" ${c.archived ? 'style="opacity:.55"' : ''}>${catIcon(c)}<div class="grow"><div class="title">${esc(c.name)}</div>${c.archived ? '<div class="sub">Archivada</div>' : ''}</div>${icon('edit')}</button>`).join('')}</div>`;
  };
  main.innerHTML = `${hint('Las categorías iniciales se pueden editar. Si una categoría ya tiene movimientos, al eliminarla se archiva para conservar el historial.')}
    ${section('expense', 'Gastos')}${section('income', 'Ingresos')}`;
  main.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.new) return catForm(null, b.dataset.new);
    if (b.dataset.cat) return catForm(S.categories.find((c) => c.id === b.dataset.cat));
  };
}
function catForm(c, kind) {
  const sel = { icon: c?.icon || 'tag', color: c?.color || COLORS[0] };
  const pickIcons = ['home', 'cart', 'car', 'heart', 'shield', 'book', 'bolt', 'film', 'repeat', 'cup', 'shirt', 'card', 'gift', 'plane', 'school', 'piggy', 'briefcase', 'store', 'coin', 'umbrella', 'users', 'tag', 'dots'].filter((i) => ICONS.includes(i));
  const s = sheet({
    title: c ? 'Editar categoría' : 'Nueva categoría',
    body: `<form class="stack" novalidate>
      <div class="field"><label for="c-n">Nombre</label><input class="input" id="c-n" name="name" maxlength="40" value="${esc(c?.name || '')}" autofocus></div>
      <div class="label">Icono</div><div class="chips" data-icons>${pickIcons.map((i) => `<button type="button" class="cat-chip" style="padding:6px" data-icon="${i}" aria-pressed="${i === sel.icon}" aria-label="${i}"><span class="cat-icon" style="color:${sel.color}">${icon(i)}</span></button>`).join('')}</div>
      <div class="label">Color</div><div class="chips" data-colors>${COLORS.map((col) => `<button type="button" class="cat-chip" style="padding:4px" data-color="${col}" aria-pressed="${col === sel.color}" aria-label="Color ${col}"><span style="display:block;width:26px;height:26px;border-radius:50%;background:${col}"></span></button>`).join('')}</div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar</button>
      ${c ? `<div class="grid-2"><button type="button" class="btn" data-archive>${c.archived ? 'Reactivar' : 'Archivar'}</button>${isAdmin() ? `<button type="button" class="btn btn-ghost" data-delete style="color:var(--neg)">Eliminar</button>` : ''}</div>` : ''}
    </form>`,
  });
  const form = s.el.querySelector('form');
  const paint = () => form.querySelectorAll('[data-icon] .cat-icon').forEach((x) => (x.style.color = sel.color));
  form.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.icon) { sel.icon = b.dataset.icon; form.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
    if (b.dataset.color) { sel.color = b.dataset.color; form.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', x === b)); paint(); }
    if (b.hasAttribute('data-archive')) { try { await patch(H(`/categories/${c.id}`), { archived: !c.archived }); s.close(); await changed(); } catch (err) { formError(form, err); } }
    if (b.hasAttribute('data-delete')) {
      const ok = await confirmDialog({ title: 'Eliminar categoría', text: 'Si tiene movimientos, se archivará en lugar de borrarse.', confirm: 'Eliminar', danger: true });
      if (!ok) return;
      try { const r = await del(H(`/categories/${c.id}`)); s.close(); toast(r.archived ? 'La categoría tenía movimientos: se archivó.' : 'Categoría eliminada.'); await changed(); } catch (err) { toast(err.message, { error: true }); }
    }
  });
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        const body = { name: form.name.value, icon: sel.icon, color: sel.color };
        if (c) await patch(H(`/categories/${c.id}`), body); else await post(H('/categories'), { ...body, kind });
        s.close(); toast('Categoría guardada.'); await changed();
      } catch (err) { formError(form, err); }
    });
  };
}

// ---------- Deudas ----------
export async function debtsView(main) {
  main.innerHTML = skeleton(140, 2);
  const debts = await get(H('/debts'));
  const active = debts.filter((d) => !d.archived);
  const total = active.reduce((s, d) => s + d.balance, 0);
  const card = (d) => {
    const pct = d.total_payments ? Math.round((d.paymentsMade / d.total_payments) * 100) : (d.start_balance ? Math.round((d.paid / d.start_balance) * 100) : 100);
    const pr = d.projection;
    return `<div class="glass card" style="padding:16px">
      <div class="row"><div class="badge-icon bi-amber">${icon('debt')}</div>
        <button class="grow link-btn" style="text-align:left;color:inherit;padding:0" data-debt="${d.id}"><div class="title" style="font-weight:600;font-size:1rem">${esc(d.name)}</div>
          <div class="small muted">${esc(d.lender || L('Sin acreedor', 'No lender'))}${d.due_day ? L(` · paga el día ${d.due_day}`, ` · due on day ${d.due_day}`) : ''}</div></button>
        <div style="text-align:right"><div class="small muted">Saldo</div><div class="num" style="font-weight:650;font-size:1.05rem">${money(d.balance)}</div></div>
        <button class="icon-btn" data-del-debt="${d.id}" aria-label="Eliminar deuda ${esc(d.name)}">${icon('trash')}</button></div>
      <div style="margin:12px 0 6px">${progress(pct, 'mint')}</div>
      ${d.total_payments
        ? `<div class="row between small"><span>Pago <b class="num">${d.paymentsMade}</b> de <b class="num">${d.total_payments}</b></span><span class="${d.paymentsLeft ? '' : 'pos'}"><b class="num">${d.paymentsLeft}</b> ${d.paymentsLeft === 1 ? 'pago restante' : 'pagos restantes'}</span></div>`
        : `<div class="small muted">Pagado ${money(d.paid)} de ${money(d.start_balance)} (${pct} %)</div>`}
      <div class="row wrap small" style="gap:6px;margin-top:8px">
        ${d.next_due && d.balance > 0 ? `<span class="chip ice">${icon('calendar')} Próximo pago ${esc(fmtDate(d.next_due, { day: 'numeric', month: 'short' }))}</span>` : ''}
        ${d.bill_id ? `<span class="chip mint">${icon('bell')} Alerta en calendario</span>` : ''}
        ${d.balance === 0 ? `<span class="chip mint">${icon('check')} Saldada</span>` : ''}</div>
      <div class="hint">${pr.months === 0 ? '¡Deuda saldada!' : pr.months ? `Proyección: ${pr.months} pagos más de ${money(d.min_payment)} para liquidarla, con ${money(pr.totalInterest)} de intereses.` : esc(pr.reason || '')}
        ${d.min_payment ? `<br>Supuestos: pago mensual fijo de ${money(d.min_payment)}; tasa anual de ${(d.rate_bp / 100).toFixed(2)} % aplicada cada mes como tasa/12; sin cargos nuevos.` : ''}</div>
      <div class="row wrap" style="gap:8px;margin-top:10px">
        ${d.balance > 0 ? `<button class="btn btn-sm" data-pay-debt="${d.id}">${icon('plus')} Registrar pago</button>` : ''}
        <button class="btn btn-sm btn-ghost" data-debt="${d.id}">${icon('edit')} Ver y editar</button></div>
    </div>`;
  };
  main.innerHTML = `
    ${active.length ? `<section class="glass card"><div class="small muted">Deuda total en seguimiento</div><div class="num" style="font-size:1.6rem;font-weight:650">${money(total)}</div>
      ${hint('Registra aquí préstamos o deudas que no son tarjetas. Las tarjetas se controlan en «Cuentas y tarjetas».')}</section>` : ''}
    ${active.length ? `<div class="grid cols-2" style="margin-top:14px">${active.map(card).join('')}</div>`
    : `<div class="glass">${empty({ ic: 'debt', title: 'Sin deudas en seguimiento', text: 'Agrega un préstamo personal, del auto o hipotecario para saber cuántos pagos te faltan y recibir la alerta en el calendario.', action: '<button class="btn btn-primary" data-new>Agregar deuda</button>' })}</div>`}
    ${active.length ? `<button class="btn btn-primary btn-block" style="margin-top:16px" data-new>${icon('plus')} Agregar deuda</button>` : ''}
    ${debts.some((d) => d.archived) ? `<details class="more" style="margin-top:14px"><summary>Deudas archivadas</summary><div class="grid cols-2" style="margin-top:8px">${debts.filter((d) => d.archived).map(card).join('')}</div></details>` : ''}`;
  main.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const find = (id) => debts.find((d) => d.id === id);
    if (b.hasAttribute('data-new')) return debtForm();
    if (b.dataset.debt) return debtDetail(find(b.dataset.debt));
    if (b.dataset.payDebt) return debtPayment(find(b.dataset.payDebt));
    if (b.dataset.delDebt) return deleteDebt(find(b.dataset.delDebt));
  };
}
async function deleteDebt(d) {
  const ok = await confirmDialog({ title: 'Eliminar deuda', text: `Se eliminará «${esc(d.name)}», su historial de pagos y su alerta del calendario. Los gastos ya registrados en tus cuentas se conservan.`, confirm: 'Eliminar', danger: true });
  if (!ok) return false;
  try { await del(H(`/debts/${d.id}`)); toast('Deuda eliminada.'); await changed(); return true; } catch (err) { toast(err.message, { error: true }); return false; }
}
function debtIcs(d) {
  if (!d.due_day || !d.next_due) return toast('Primero indica el día de pago de la deuda.', { error: true });
  download(`pago-${d.name.replace(/[^\w-]+/g, '-')}.ics`, icsFile({
    title: `Pago: ${d.name} (${money(d.min_payment)})`, start: d.next_due, count: d.paymentsLeft || undefined, alarmDays: d.reminder_days ?? 3,
    description: `JP Solution · ${d.lender || ''} · saldo ${money(d.balance)}`,
  }), 'text/calendar');
  toast('Abre el archivo descargado para agregarlo al calendario de tu teléfono.');
}
function debtDetail(d) {
  const s = sheet({
    title: d.name,
    body: `<div class="stack">
      <div class="glass card tight"><div class="row between"><div><div class="small muted">Saldo actual</div><div class="num" style="font-size:1.4rem;font-weight:650">${money(d.balance)}</div></div>
        <div style="text-align:right" class="small">Tasa anual ${(d.rate_bp / 100).toFixed(2)} %<br>Pago mensual ${money(d.min_payment)}</div></div>
        ${d.total_payments ? `<div class="small" style="margin-top:8px">Pagos hechos <b>${d.paymentsMade}</b> de <b>${d.total_payments}</b> · faltan <b>${d.paymentsLeft}</b></div>` : ''}</div>
      ${d.archived || !d.balance ? '' : `<button class="btn btn-primary" data-pay>${icon('plus')} Registrar pago</button>`}
      ${d.due_day && d.balance ? `<button class="btn" data-ics>${icon('calendar')} Agregar al calendario de mi teléfono</button>
        ${hint('Descarga un archivo de calendario con el pago mensual y su aviso; ábrelo en tu teléfono para guardarlo.')}` : ''}
      <div class="label">Pagos registrados en la app</div>
      ${d.payments.length ? `<div class="list">${d.payments.map((p) => `<div class="glass item" style="cursor:default"><div class="grow"><div class="title num">${money(p.amount)}</div><div class="sub">${esc(fmtDate(p.date))}${p.note ? ' · ' + esc(p.note) : ''}${p.transaction_id ? ' · registrado como gasto' : ''}</div></div>
        <button class="icon-btn" data-rm="${p.id}" aria-label="Eliminar pago">${icon('trash')}</button></div>`).join('')}</div>` : '<p class="small muted">Aún no hay pagos.</p>'}
      <div class="grid-2"><button class="btn" data-edit>${icon('edit')} Editar</button><button class="btn" data-archive>${d.archived ? 'Reactivar' : 'Archivar'}</button></div>
      <button class="btn btn-ghost" data-delete style="color:var(--neg)">${icon('trash')} Eliminar deuda</button></div>`,
  });
  s.el.onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-pay')) { s.close(); return debtPayment(d); }
    if (b.hasAttribute('data-ics')) return debtIcs(d);
    if (b.hasAttribute('data-edit')) { s.close(); return debtForm(d); }
    if (b.hasAttribute('data-archive')) { try { await patch(H(`/debts/${d.id}`), { archived: !d.archived }); s.close(); await changed(); } catch (err) { toast(err.message, { error: true }); } }
    if (b.dataset.rm) {
      const ok = await confirmDialog({ title: 'Eliminar pago', text: 'Si el pago se registró como gasto, ese movimiento también se eliminará.', confirm: 'Eliminar', danger: true });
      if (!ok) return;
      try { await del(H(`/debts/${d.id}/payments/${b.dataset.rm}`)); s.close(); toast('Pago eliminado.'); await changed(); } catch (err) { toast(err.message, { error: true }); }
    }
    if (b.hasAttribute('data-delete')) { if (await deleteDebt(d)) s.close(); }
  };
}
function debtForm(d) {
  const accs = activeAccounts();
  const s = sheet({
    title: d ? 'Editar deuda' : 'Nueva deuda',
    body: `<form class="stack" novalidate>
      <div class="field"><label for="d-n">Nombre</label><input class="input" id="d-n" name="name" maxlength="60" placeholder="Ej. Préstamo del auto" value="${esc(d?.name || '')}" autofocus></div>
      <div class="field"><label for="d-l">Acreedor (opcional)</label><input class="input" id="d-l" name="lender" maxlength="60" value="${esc(d?.lender || '')}"></div>
      <div class="grid-2"><div class="field"><label for="d-b">Saldo pendiente</label><input class="input num" id="d-b" name="start_balance" inputmode="decimal" value="${d ? centsToInput(d.start_balance) : ''}"></div>
        <div class="field"><label for="d-s">A la fecha</label><input class="input" id="d-s" type="date" name="start_date" value="${d?.start_date || today()}"></div></div>
      <div class="grid-2"><div class="field"><label for="d-m">Pago mensual</label><input class="input num" id="d-m" name="min_payment" inputmode="decimal" value="${d ? centsToInput(d.min_payment) : ''}"></div>
        <div class="field"><label for="d-r">Tasa anual (%)</label><input class="input num" id="d-r" name="rate" inputmode="decimal" placeholder="0" value="${d ? (d.rate_bp / 100).toFixed(2) : ''}"></div></div>
      <div class="grid-2"><div class="field"><label for="d-t">Total de pagos (cuotas)</label><input class="input num" id="d-t" name="total_payments" inputmode="numeric" placeholder="Ej. 48" value="${d?.total_payments ?? ''}"></div>
        <div class="field"><label for="d-pb">Pagos ya hechos</label><input class="input num" id="d-pb" name="payments_before" inputmode="numeric" placeholder="0" value="${d?.payments_before || ''}"></div></div>
      ${hint('Ejemplo: un préstamo a 48 meses del que ya pagaste 12 → total 48, ya hechos 12. La app te dirá cuántos pagos faltan; los pagos que registres aquí se suman solos.')}
      <div class="field"><label for="d-dd">Día de pago</label><select class="input" id="d-dd" name="due_day"><option value="">—</option>${Array.from({ length: 31 }, (_, i) => `<option ${d?.due_day === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
      <label class="check"><input type="checkbox" name="alert" ${d?.alert ? 'checked' : ''}> Mostrar los pagos en el calendario y avisarme</label>
      <div class="stack" data-alert ${d?.alert ? '' : 'hidden'}>
        <div class="grid-2"><div class="field"><label for="d-rd">Aviso</label><select class="input" id="d-rd" name="reminder_days">${[[0, 'El mismo día'], [1, '1 día antes'], [3, '3 días antes'], [7, '1 semana antes']].map(([v, n]) => `<option value="${v}" ${(d?.reminder_days ?? 3) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="d-ac">Se paga desde</label><select class="input" id="d-ac" name="account_id"><option value="">Elegir al pagar</option>${accs.map((a) => `<option value="${a.id}" ${a.id === d?.account_id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div></div>
        ${hint('Cada mes aparecerá «Pago: nombre de la deuda» en el Calendario y en Próximos pagos. Al marcarlo pagado, también se descuenta de la deuda.')}
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar</button></form>`,
  });
  const form = s.el.querySelector('form');
  form.alert.onchange = () => { form.querySelector('[data-alert]').hidden = !form.alert.checked; };
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const bal = parseMoney(form.start_balance.value), pay = form.min_payment.value ? parseMoney(form.min_payment.value) : 0;
        const rate = form.rate.value ? parseMoney(form.rate.value) : 0;
        if (Number.isNaN(bal) || Number.isNaN(pay) || Number.isNaN(rate)) throw new Error('Revisa los importes y la tasa.');
        const int = (v) => (v.trim() ? Number.parseInt(v, 10) : null);
        const body = { name: form.name.value, lender: form.lender.value, start_balance: bal, start_date: form.start_date.value, rate_bp: rate, min_payment: pay,
          due_day: form.due_day.value ? Number(form.due_day.value) : null, total_payments: int(form.total_payments.value), payments_before: int(form.payments_before.value) || 0,
          alert: form.alert.checked, reminder_days: Number(form.reminder_days.value), account_id: form.account_id.value || null };
        if (d) await patch(H(`/debts/${d.id}`), body); else await post(H('/debts'), body);
        s.close(); toast(body.alert ? 'Deuda guardada. Sus pagos ya aparecen en el calendario.' : 'Deuda guardada.'); await changed();
      } catch (err) { formError(form, err); }
    });
  };
}
function debtPayment(d) {
  const clientId = newClientId();
  const s = sheet({
    title: `Pago · ${d.name}`,
    body: `<form class="stack" novalidate>
      <div class="amount-wrap"><input class="input amount-input num" name="amount" inputmode="decimal" value="${centsToInput(Math.min(d.min_payment || d.balance, d.balance))}" aria-label="Importe" autofocus></div>
      <div class="grid-2"><div class="field"><label for="dp-d">Fecha</label><input class="input" id="dp-d" type="date" name="date" value="${today()}"></div>
        <div class="field"><label for="dp-a">Pagado desde</label><select class="input" id="dp-a" name="account_id"><option value="">Solo registrar el pago</option>${activeAccounts().map((a) => `<option value="${a.id}" ${a.id === d.account_id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div></div>
      ${hint('Si eliges una cuenta, también se registra el gasto en «Deudas y préstamos»' + (d.bill_id ? ' y se marca pagado el vencimiento del calendario.' : '.'))}
      <div class="field"><label for="dp-n">Nota (opcional)</label><input class="input" id="dp-n" name="note" maxlength="140"></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Registrar pago</button></form>`,
  });
  const form = s.el.querySelector('form');
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        const amount = parseMoney(form.amount.value);
        if (!amount || amount <= 0) throw Object.assign(new Error('Escribe un importe mayor que cero.'), { field: 'amount' });
        await post(H(`/debts/${d.id}/payments`), { amount, date: form.date.value, account_id: form.account_id.value || null, note: form.note.value, client_id: clientId });
        s.close(); toast('Pago registrado.'); await changed();
      } catch (err) { formError(form, err); }
    });
  };
}

// ---------- Recurrentes ----------
const FREQ_NAMES = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual' };
export async function recurringView(main) {
  main.innerHTML = skeleton(80, 3);
  const list = await get(H('/recurring'));
  main.innerHTML = `${hint('Los movimientos recurrentes se crean solos en su fecha. Para crear uno nuevo, registra un movimiento y elige «Repetir» en «Más detalles».')}
    ${list.length ? `<div class="list" style="margin-top:12px">${list.map((r) => {
      const t = r.template;
      return `<div class="glass item" style="cursor:default;${r.active ? '' : 'opacity:.6'}"><div class="badge-icon bi-ice">${icon('repeat')}</div>
        <div class="grow"><div class="title ellipsis">${esc(t.description)}</div><div class="sub">${FREQ_NAMES[r.frequency]} · ${esc(account(t.account_id)?.name || '')}${r.active && r.next ? ` · próximo ${esc(fmtDate(r.next, { day: 'numeric', month: 'short' }))}` : ''}${r.end_date ? ` · hasta ${esc(fmtDate(r.end_date))}` : ''}${r.active ? '' : ' · Detenido'}</div></div>
        <div style="display:grid;justify-items:end;gap:4px"><b class="num ${t.type === 'expense' ? 'neg' : t.type === 'transfer' ? '' : 'pos'}">${money(t.amount)}</b>
        <button class="link-btn" data-toggle="${r.id}" data-active="${r.active}">${r.active ? 'Detener' : 'Reanudar'}</button></div></div>`;
    }).join('')}</div>`
    : `<div class="glass" style="margin-top:12px">${empty({ ic: 'repeat', title: 'Sin movimientos recurrentes', text: 'Úsalos para el salario, la renta o las suscripciones: se registran solos cada semana, quincena, mes o año.' })}</div>`}`;
  main.onclick = async (e) => {
    const b = e.target.closest('[data-toggle]'); if (!b) return;
    const active = b.dataset.active === '1';
    if (active) {
      const ok = await confirmDialog({ title: 'Detener recurrente', text: 'No se crearán más movimientos de esta serie. Los ya registrados se conservan.', confirm: 'Detener' });
      if (!ok) return;
    }
    try { await patch(H(`/recurring/${b.dataset.toggle}`), { active: !active }); toast(active ? 'Serie detenida.' : 'Serie reanudada; se crearán los movimientos pendientes.'); await changed(); recurringView(main); }
    catch (err) { toast(err.message, { error: true }); }
  };
}

// ---------- Perfil ----------
export async function profileView(main) {
  if (LOCAL) {
    main.innerHTML = `<section class="glass card" style="margin-top:6px"><h3>Tu nombre</h3>
      <form class="stack" data-profile novalidate><div class="field"><label for="p-n">Nombre</label><input class="input" id="p-n" name="name" value="${esc(S.me.user.name)}" maxlength="60"></div>
        ${hint('Se usa para saber qué movimientos registraste tú y cuáles pertenecen a otros nombres.')}
        <button class="btn btn-primary" type="submit">Guardar</button></form></section>
      <div class="stack" style="margin-top:14px"><a class="btn" href="#/seguridad">${icon('lock')} Seguridad y bloqueo</a><a class="btn" href="#/respaldo">${icon('download')} Respaldo y datos</a></div>`;
    main.querySelector('[data-profile]').onsubmit = (e) => {
      e.preventDefault(); const form = e.target;
      busy(form.querySelector('[type=submit]'), async () => { try { S.me = { ...S.me, ...(await patch('/me', { name: form.name.value })) }; await refreshHousehold(); toast('Datos guardados.'); } catch (err) { formError(form, err); } });
    };
    return;
  }
  main.innerHTML = `
    <section class="glass card" style="margin-top:6px"><h3>Tus datos</h3>
      <form class="stack" data-profile novalidate>
        <div class="field"><label for="p-n">Nombre</label><input class="input" id="p-n" name="name" value="${esc(S.me.user.name)}" maxlength="60"></div>
        <div class="field"><label>Correo</label><input class="input" value="${esc(S.me.user.email)}" disabled></div>
        <button class="btn btn-primary" type="submit">Guardar</button></form></section>
    <section class="glass card" style="margin-top:14px"><h3>${icon('lock')} Cambiar contraseña</h3>
      <form class="stack" data-pw novalidate>
        <div class="field"><label for="p-c">Contraseña actual</label><input class="input" id="p-c" type="password" name="current_password" autocomplete="current-password"></div>
        <div class="field"><label for="p-w">Contraseña nueva (mínimo 8)</label><input class="input" id="p-w" type="password" name="new_password" autocomplete="new-password"></div>
        <button class="btn" type="submit">Cambiar contraseña</button></form></section>
    <section class="glass card" style="margin-top:14px"><h3>Privacidad</h3>
      <div class="stack"><button class="btn" data-export>${icon('download')} Descargar todos mis datos</button>
        ${hint('Incluye tu perfil y los datos de los hogares a los que perteneces, en formato JSON.')}
        <button class="btn btn-ghost" data-delete style="color:var(--neg)">${icon('trash')} Eliminar mi cuenta</button>
        ${hint('Si eres la única persona de un hogar, ese hogar se elimina. Si eres el único administrador de un hogar con más integrantes, primero nombra a otro administrador.')}</div></section>`;
  main.querySelector('[data-profile]').onsubmit = (e) => {
    e.preventDefault(); const form = e.target;
    busy(form.querySelector('[type=submit]'), async () => { try { S.me = { ...S.me, ...(await patch('/me', { name: form.name.value })) }; await refreshHousehold(); toast('Datos guardados.'); } catch (err) { formError(form, err); } });
  };
  main.querySelector('[data-pw]').onsubmit = (e) => {
    e.preventDefault(); const form = e.target;
    busy(form.querySelector('[type=submit]'), async () => {
      try { await patch('/me', { current_password: form.current_password.value, new_password: form.new_password.value }); form.reset(); toast('Contraseña actualizada.'); } catch (err) { formError(form, err); }
    });
  };
  main.querySelector('[data-export]').onclick = (e) => busy(e.currentTarget, async () => {
    try { const d = await get('/me/export'); download(`jp-solution-mis-datos-${today()}.json`, JSON.stringify(d, null, 2)); } catch (err) { toast(err.message, { error: true }); }
  });
  main.querySelector('[data-delete]').onclick = async () => {
    const pw = await confirmDialog({ title: 'Eliminar mi cuenta', text: 'Esta acción no se puede deshacer. Descarga tus datos antes si los necesitas.', confirm: 'Eliminar mi cuenta', danger: true, input: { label: 'Escribe tu contraseña para confirmar', type: 'password', autocomplete: 'current-password' } });
    if (!pw) return;
    try { await del('/me', { password: pw }); S.me = null; S.hid = null; closeAllSheets(); toast('Tu cuenta fue eliminada.'); go('entrar'); } catch (err) { toast(err.message, { error: true }); }
  };
}
