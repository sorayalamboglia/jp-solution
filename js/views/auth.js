// Acceso: iniciar sesión, crear cuenta, recuperar contraseña, unirse con invitación y crear el hogar.
import { get, post, ApiError } from '../api.js';
import { S, selectHousehold } from '../store.js';
import { icon, esc, busy, formError, clearFormError, parseMoney, toast, hint } from '../ui.js';
import { go } from '../nav.js';
import { getLang, setLang } from '../i18n.js';
import { LOCAL } from '../mode.js';
import { L } from '../i18n.js';
import { patch } from '../api.js';

const langSwitch = `<div class="row" style="justify-content:flex-end;margin:-8px -6px 4px"><div class="seg" role="group" aria-label="Idioma" style="width:190px">${['es', 'en'].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${getLang() === l}">${l === 'es' ? 'Español' : 'English'}</button>`).join('')}</div></div>`;
const logo = langSwitch + `<div class="logo"><div class="brand-mark">${icon('family')}</div><div><div class="brand-name">JP Solution</div><div class="brand-sub">Finanzas familiares</div></div></div>`;
const field = (name, label, type = 'text', attrs = '') => `<div class="field"><label for="f-${name}">${label}</label><input class="input" id="f-${name}" name="${name}" type="${type}" ${attrs}></div>`;

export async function authView(root, name, params) {
  const wrap = (inner) => {
    root.innerHTML = `<div class="auth"><div class="panel glass view-enter">${logo}${inner}</div></div>`;
    root.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => b.dataset.lang !== getLang() && setLang(b.dataset.lang)));
    return root.querySelector('form');
  };

  if (name === 'registro') {
    const form = wrap(`<h1>Crea tu cuenta</h1><p class="muted" style="margin-top:0">Cada integrante usa su propia cuenta. Así se sabe quién registró cada movimiento.</p>
      <form class="stack" novalidate>
        ${field('name', 'Tu nombre', 'text', 'autocomplete="name" required maxlength="60"')}
        ${field('email', 'Correo', 'email', 'autocomplete="email" required')}
        ${field('password', 'Contraseña (mínimo 8 caracteres)', 'password', 'autocomplete="new-password" required minlength="8"')}
        ${params.codigo ? `<input type="hidden" name="invite" value="${esc(params.codigo)}"><div class="chip">${icon('link')} Te unirás al hogar con la invitación ${esc(params.codigo)}</div>` : ''}
        <button class="btn btn-primary btn-lg btn-block" type="submit">Crear cuenta</button>
        <p class="small muted" style="text-align:center;margin:0">¿Ya tienes cuenta? <a href="#/entrar${params.codigo ? '?codigo=' + esc(params.codigo) : ''}">Inicia sesión</a></p>
      </form>`);
    form.onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      busy(form.querySelector('[type=submit]'), async () => {
        try {
          clearFormError(form);
          S.me = await post('/auth/register', d);
          S.hid = null;
          if (d.invite) { await selectHousehold(S.me.households[0]?.id); toast('Te uniste al hogar.'); }
          go(S.me.households.length ? 'inicio' : 'bienvenida');
        } catch (err) { formError(form, err); }
      });
    };
    return;
  }

  if (name === 'olvide') {
    const form = wrap(`<h1>Recupera tu acceso</h1><p class="muted" style="margin-top:0">Te enviaremos un enlace para crear una contraseña nueva.</p>
      <form class="stack" novalidate>${field('email', 'Correo de tu cuenta', 'email', 'autocomplete="email" required')}
        <button class="btn btn-primary btn-lg btn-block" type="submit">Enviar enlace</button>
        <p class="small muted" style="text-align:center;margin:0"><a href="#/entrar">Volver a iniciar sesión</a></p></form>`);
    form.onsubmit = (e) => {
      e.preventDefault();
      busy(form.querySelector('[type=submit]'), async () => {
        try {
          const r = await post('/auth/forgot', Object.fromEntries(new FormData(form)));
          form.innerHTML = `<div class="stack"><div class="chip mint">${icon('check')} Solicitud recibida</div><p>${esc(r.message)}</p>
            ${hint('Si el envío de correos todavía no está configurado, quien administra el servidor encontrará el enlace en la ventana donde se ejecuta JP Solution.')}
            <a class="btn btn-block" href="#/entrar">Volver</a></div>`;
        } catch (err) { formError(form, err); }
      });
    };
    return;
  }

  if (name === 'restablecer') {
    const form = wrap(`<h1>Nueva contraseña</h1>
      <form class="stack" novalidate>${field('password', 'Contraseña nueva (mínimo 8 caracteres)', 'password', 'autocomplete="new-password" required minlength="8"')}
        <button class="btn btn-primary btn-lg btn-block" type="submit">Guardar y entrar</button></form>`);
    form.onsubmit = (e) => {
      e.preventDefault();
      busy(form.querySelector('[type=submit]'), async () => {
        try {
          S.me = await post('/auth/reset', { token: params.token, password: form.password.value });
          S.hid = null;
          toast('Contraseña actualizada.');
          go(S.me.households.length ? 'inicio' : 'bienvenida');
        } catch (err) { formError(form, err); }
      });
    };
    return;
  }

  if (name === 'unirse') {
    let info;
    try { info = await get('/invites/' + encodeURIComponent(params.codigo || '')); }
    catch (err) {
      wrap(`<h1>Invitación no disponible</h1><p class="muted">${esc(err.message)}</p><a class="btn btn-block" href="#/${S.me ? 'inicio' : 'entrar'}">Continuar</a>`);
      return;
    }
    const role = info.role === 'admin' ? 'administrador' : 'miembro';
    if (!S.me) {
      wrap(`<h1>Te invitaron a «${esc(info.household_name)}»</h1><p class="muted">Entrarás como ${role}. Crea tu cuenta o inicia sesión para aceptar.</p>
        <div class="stack"><a class="btn btn-primary btn-lg btn-block" href="#/registro?codigo=${esc(params.codigo)}">Crear cuenta</a>
        <a class="btn btn-block" href="#/entrar?codigo=${esc(params.codigo)}">Ya tengo cuenta</a></div>`);
      return;
    }
    wrap(`<h1>Únete a «${esc(info.household_name)}»</h1><p class="muted">Entrarás como ${role} con tu cuenta ${esc(S.me.user.email)}.</p>
      <form class="stack"><button class="btn btn-primary btn-lg btn-block" type="submit">Unirme al hogar</button><a class="btn btn-ghost btn-block" href="#/inicio">Ahora no</a></form>`);
    const form = root.querySelector('form');
    form.onsubmit = (e) => {
      e.preventDefault();
      busy(form.querySelector('[type=submit]'), async () => {
        try {
          const r = await post('/invites/accept', { code: params.codigo });
          S.me = r.me; await selectHousehold(r.id);
          toast('Te uniste al hogar.');
          go('inicio');
        } catch (err) { formError(form, err); }
      });
    };
    return;
  }

  // Iniciar sesión
  const form = wrap(`<h1>Hola de nuevo</h1><p class="muted" style="margin-top:0">Organiza las finanzas de tu familia en un solo lugar.</p>
    <form class="stack" novalidate>
      ${field('email', 'Correo', 'email', 'autocomplete="email" required')}
      ${field('password', 'Contraseña', 'password', 'autocomplete="current-password" required')}
      <button class="btn btn-primary btn-lg btn-block" type="submit">Entrar</button>
      <div class="row between small"><a href="#/olvide">Olvidé mi contraseña</a><a href="#/registro${params.codigo ? '?codigo=' + esc(params.codigo) : ''}">Crear cuenta</a></div>
    </form>`);
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        S.me = await post('/auth/login', Object.fromEntries(new FormData(form)));
        S.hid = null;
        if (params.codigo) return go('unirse', { codigo: params.codigo });
        go(S.me.households.length ? 'inicio' : 'bienvenida');
      } catch (err) { formError(form, err); }
    });
  };
}

const CURRENCIES = [['USD', 'Dólar estadounidense'], ['MXN', 'Peso mexicano'], ['EUR', 'Euro'], ['COP', 'Peso colombiano'], ['ARS', 'Peso argentino'], ['CLP', 'Peso chileno'],
  ['PEN', 'Sol peruano'], ['DOP', 'Peso dominicano'], ['GTQ', 'Quetzal'], ['CRC', 'Colón costarricense'], ['HNL', 'Lempira'], ['UYU', 'Peso uruguayo'], ['BOB', 'Boliviano'],
  ['PYG', 'Guaraní'], ['VES', 'Bolívar'], ['NIO', 'Córdoba'], ['PAB', 'Balboa'], ['CAD', 'Dólar canadiense'], ['GBP', 'Libra esterlina']];
export const currencyOptions = (sel) => CURRENCIES.map(([c, n]) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c} · ${n}</option>`).join('');
export function timezoneOptions(sel) {
  let zones = [];
  try { zones = Intl.supportedValuesOf('timeZone'); } catch { zones = [sel]; }
  if (!zones.includes(sel)) zones.unshift(sel);
  return zones.map((z) => `<option ${z === sel ? 'selected' : ''}>${esc(z)}</option>`).join('');
}
export const dayOptions = (sel) => Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}" ${i + 1 === sel ? 'selected' : ''}>Día ${i + 1}</option>`).join('');

const ACC_TYPES = [['bank', 'Cuenta bancaria'], ['cash', 'Efectivo'], ['savings', 'Ahorros'], ['credit', 'Tarjeta de crédito']];
const accRow = (a = {}) => `<div class="glass card tight stack acc-row">
  <div class="row"><input class="input grow" name="acc_name" placeholder="Nombre (ej. Banco, Efectivo)" value="${esc(a.name || '')}" maxlength="60" aria-label="Nombre de la cuenta">
    <button type="button" class="icon-btn" data-remove aria-label="Quitar cuenta">${icon('x')}</button></div>
  <div class="grid-2"><select class="input" name="acc_type" aria-label="Tipo de cuenta">${ACC_TYPES.map(([v, n]) => `<option value="${v}" ${v === a.type ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <input class="input num" name="acc_balance" inputmode="decimal" placeholder="Saldo hoy" value="${esc(a.balance || '')}" aria-label="Saldo actual"></div>
  <div class="hint">En tarjetas de crédito, escribe lo que debes hoy.</div></div>`;

export function onboardingView(root) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  const hasOther = S.me.households.length > 0;
  root.innerHTML = `<div class="auth"><div class="panel glass view-enter" style="width:min(560px,100%)">${logo}
    <h1>${hasOther ? 'Crea otro hogar' : LOCAL ? 'Bienvenida a JP Solution' : `Hola, ${esc(S.me.user.name.split(' ')[0])}`}</h1>
    <p class="muted" style="margin-top:0">Configura tu hogar en un minuto. Podrás cambiarlo después.</p>
    <form class="stack" novalidate>
      ${LOCAL && !hasOther ? `<div class="field"><label for="yn">¿Cómo te llamas?</label><input class="input" id="yn" name="myname" maxlength="60" placeholder="Tu nombre" value="${S.me.user.name === 'Yo' ? '' : esc(S.me.user.name)}"></div>` : ''}
      <div class="field"><label for="hn">Nombre del hogar</label><input class="input" id="hn" name="name" placeholder="Ej. Familia Pérez" maxlength="60" required></div>
      <div class="grid-2">
        <div class="field"><label>Moneda</label><input class="input" value="${L('Dólar estadounidense (USD)', 'US dollar (USD)')}" disabled><input type="hidden" name="currency" value="USD"></div>
        <div class="field"><label for="hd">Inicio del mes</label><select class="input" id="hd" name="start_day">${dayOptions(1)}</select></div>
      </div>
      ${hint('El «inicio del mes» es el día en que empieza tu presupuesto; por ejemplo, el día en que cobras.')}
      <div class="field"><label for="ht">Zona horaria</label><select class="input" id="ht" name="timezone">${timezoneOptions(tz)}</select></div>
      <div class="label" style="margin-top:6px">Cuentas y saldos de hoy</div>
      <div class="hint" style="margin-top:-8px">Empieza con lo que tienes hoy; no hace falta registrar el pasado.</div>
      <div class="stack" id="accs">${accRow({ name: 'Cuenta bancaria', type: 'bank' })}${accRow({ name: 'Efectivo', type: 'cash' })}</div>
      <button type="button" class="btn btn-ghost" data-add>${icon('plus')} Agregar cuenta o tarjeta</button>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Crear hogar</button>
    </form>
    <div class="stack" style="margin-top:18px">
      ${LOCAL ? '' : `<details class="more"><summary>Tengo un código de invitación</summary>
        <form class="row" id="join" style="margin-top:8px"><input class="input grow" name="code" placeholder="Código" autocapitalize="characters" aria-label="Código de invitación"><button class="btn" type="submit">Unirme</button></form></details>`}
      ${LOCAL && !hasOther ? '<a class="btn btn-ghost btn-block" href="#/respaldo">Ya tengo un respaldo: restaurarlo</a>' : ''}
      ${S.me.households.some((x) => x.is_demo) ? '' : `<button class="btn btn-ghost btn-block" data-demo>${icon('sparkles')} Probar primero con datos de demostración</button>
      <div class="hint" style="text-align:center">La demostración se crea como un hogar aparte; tus datos reales no se mezclan.</div>`}
      ${hasOther ? '<a class="btn btn-ghost btn-block" href="#/inicio">Cancelar</a>' : LOCAL ? '' : '<button class="link-btn" data-logout>Cerrar sesión</button>'}
    </div></div></div>`;
  const form = root.querySelector('form');
  root.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => b.dataset.lang !== getLang() && setLang(b.dataset.lang)));
  const accs = root.querySelector('#accs');
  root.querySelector('[data-add]').onclick = () => accs.insertAdjacentHTML('beforeend', accRow({ type: 'bank' }));
  accs.addEventListener('click', (e) => { if (e.target.closest('[data-remove]')) e.target.closest('.acc-row').remove(); });
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const accounts = [...accs.querySelectorAll('.acc-row')].map((r) => {
          const name = r.querySelector('[name=acc_name]').value.trim();
          const type = r.querySelector('[name=acc_type]').value;
          const raw = r.querySelector('[name=acc_balance]').value;
          if (!name && !raw) return null;
          if (!name) throw new ApiError('Ponle nombre a cada cuenta.');
          const cents = raw ? parseMoney(raw) : 0;
          if (Number.isNaN(cents)) throw new ApiError(`Revisa el saldo de «${name}».`);
          return { name, type, opening_balance: type === 'credit' ? -cents : cents };
        }).filter(Boolean);
        const d = Object.fromEntries(new FormData(form));
        if (LOCAL && d.myname?.trim()) await patch('/me', { name: d.myname.trim() });
        const r = await post('/households', { name: d.name, currency: d.currency, timezone: d.timezone, start_day: Number(d.start_day), accounts });
        S.me = r.me; await selectHousehold(r.id);
        toast('¡Listo! Tu hogar está creado.');
        go('inicio');
      } catch (err) { formError(form, err); }
    });
  };
  const join = root.querySelector('#join');
  if (join) join.onsubmit = (e) => { e.preventDefault(); if (join.code.value.trim()) go('unirse', { codigo: join.code.value.trim().toUpperCase() }); };
  root.querySelector('[data-demo]')?.addEventListener('click', (e) => busy(e.currentTarget, async () => {
    try {
      const r = await post('/households/demo');
      S.me = r.me; await selectHousehold(r.id);
      toast('Hogar de demostración listo.');
      go('inicio');
    } catch (err) { toast(err.message, { error: true }); }
  }));
  root.querySelector('[data-logout]')?.addEventListener('click', async () => { await post('/auth/logout'); S.me = null; S.hid = null; go('entrar'); });
}
