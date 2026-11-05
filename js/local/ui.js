// Pantallas exclusivas de la versión personal: bloqueo, seguridad, respaldo en Google Sheets y borrado de datos.
import * as E from './engine.js';
import { sheetsConfig, testConnection, backupNow, fetchRemoteBackup } from './sheets.js';
import { icon, esc, hint, busy, toast, confirmDialog, formError, clearFormError, download, fmtDate } from '../ui.js';
import { getLang, setLang, L } from '../i18n.js';

const logo = `<div class="logo"><div class="brand-mark">${icon('family')}</div><div><div class="brand-name">JP Solution</div><div class="brand-sub">Finanzas familiares</div></div></div>`;
const when = (iso) => (iso ? `${fmtDate(iso.slice(0, 10), { day: 'numeric', month: 'short' })} ${new Date(iso).toLocaleTimeString(getLang() === 'en' ? 'en-US' : 'es', { hour: '2-digit', minute: '2-digit' })}` : '');

// ---------- Pantalla de bloqueo ----------
export async function lockView(root, onUnlocked) {
  const info = await E.lockInfo();
  root.className = 'app';
  root.innerHTML = `<div class="auth"><div class="panel glass view-enter">
    <div class="row" style="justify-content:flex-end;margin:-8px -6px 4px"><div class="seg" role="group" aria-label="Idioma" style="width:190px">${['es', 'en'].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${getLang() === l}">${l === 'es' ? 'Español' : 'English'}</button>`).join('')}</div></div>
    ${logo}
    <h1>${icon('lock')} App bloqueada</h1><p class="muted" style="margin-top:0">Escribe tu usuario y contraseña para ver tu información.</p>
    <form class="stack" novalidate>
      <div class="field"><label for="lk-u">Usuario</label><input class="input" id="lk-u" name="username" autocomplete="username" autocapitalize="none" value="${esc(info?.username || '')}" required></div>
      <div class="field"><label for="lk-p">Contraseña</label><input class="input" id="lk-p" name="password" type="password" autocomplete="current-password" required autofocus></div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Desbloquear</button>
      <button type="button" class="link-btn" data-forgot>Olvidé mi contraseña</button>
    </form></div></div>`;
  root.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => b.dataset.lang !== getLang() && setLang(b.dataset.lang)));
  const form = root.querySelector('form');
  setTimeout(() => form.password.focus(), 50);
  form.onsubmit = (e) => {
    e.preventDefault();
    busy(form.querySelector('[type=submit]'), async () => {
      clearFormError(form);
      if (await E.unlock(form.username.value, form.password.value)) onUnlocked();
      else formError(form, { message: L('Usuario o contraseña incorrectos.', 'Incorrect username or password.'), field: 'password' });
    });
  };
  root.querySelector('[data-forgot]').onclick = async () => {
    const ok = await confirmDialog({
      title: L('Olvidé mi contraseña', 'Forgot my password'),
      text: L('Por seguridad, la contraseña no se puede recuperar: tus datos están cifrados con ella. Puedes borrar los datos de este teléfono y luego restaurarlos desde tu respaldo de Google Sheets (necesitarás la dirección y la clave de tu Apps Script).',
        'For security, the password can’t be recovered: your data is encrypted with it. You can erase this phone’s data and then restore it from your Google Sheets backup (you’ll need your Apps Script address and key).'),
      confirm: L('Borrar datos de este teléfono', 'Erase this phone’s data'), danger: true,
      input: { label: L('Escribe BORRAR para confirmar', 'Type BORRAR to confirm') },
    });
    if (String(ok).trim().toUpperCase() !== 'BORRAR') return;
    await E.wipeAll();
    location.hash = '#/respaldo';
    location.reload();
  };
}

// Bloqueo automático: si la app queda en segundo plano más del tiempo elegido, se vuelve a pedir la contraseña.
let hiddenAt = 0;
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
  const mins = Number(localStorage.getItem('jp-autolock') ?? 1);
  if (hiddenAt && Date.now() - hiddenAt >= mins * 60000 && (await E.isLockEnabled())) { await E.flush(); location.reload(); }
});

// ---------- Seguridad y bloqueo ----------
export async function securityView(main) {
  const info = await E.lockInfo();
  const mins = localStorage.getItem('jp-autolock') ?? '1';
  main.innerHTML = `
    <section class="glass card" style="margin-top:6px"><h3>${icon('lock')} Bloqueo con usuario y contraseña</h3>
      ${info ? `<div class="chip mint" style="margin-bottom:10px">${icon('check')} Activado · usuario «${esc(info.username)}»</div>
        <div class="field" style="margin-bottom:12px"><label for="al">Bloquear cuando salgo de la app</label><select class="input" id="al">
          ${[['0', 'De inmediato'], ['1', 'Después de 1 minuto'], ['5', 'Después de 5 minutos'], ['15', 'Después de 15 minutos']].map(([v, n]) => `<option value="${v}" ${v === mins ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="stack"><button class="btn" data-change>${icon('edit')} Cambiar usuario o contraseña</button>
          <button class="btn btn-ghost" data-off style="color:var(--neg)">Quitar el bloqueo</button><button class="btn btn-ghost" data-lock-now>${icon('lock')} Bloquear ahora</button></div>`
      : `<p class="small muted" style="margin-top:0">Al activarlo, la app pedirá tu usuario y contraseña cada vez que la abras, y tu información quedará cifrada en el teléfono.</p>
        <form class="stack" data-enable novalidate>
          <div class="field"><label for="se-u">Usuario</label><input class="input" id="se-u" name="username" autocomplete="username" autocapitalize="none" minlength="3"></div>
          <div class="field"><label for="se-p">Contraseña (mínimo 6 caracteres)</label><input class="input" id="se-p" name="password" type="password" autocomplete="new-password"></div>
          <div class="field"><label for="se-p2">Repite la contraseña</label><input class="input" id="se-p2" name="password2" type="password" autocomplete="new-password"></div>
          <button class="btn btn-primary" type="submit">${icon('lock')} Activar bloqueo</button></form>`}
      ${hint('Importante: si olvidas la contraseña no se puede recuperar. Tendrías que borrar los datos del teléfono y restaurarlos desde tu respaldo de Google Sheets. Activa el respaldo antes de poner el bloqueo.')}
    </section>`;
  main.querySelector('#al')?.addEventListener('change', (e) => { localStorage.setItem('jp-autolock', e.target.value); toast(L('Guardado.', 'Saved.')); });
  main.querySelector('[data-enable]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        if (form.password.value !== form.password2.value) throw Object.assign(new Error(L('Las contraseñas no coinciden.', 'Passwords don’t match.')), { field: 'password2' });
        await E.enableLock(form.username.value, form.password.value);
        toast(L('Bloqueo activado. Tu información quedó cifrada.', 'Lock enabled. Your data is now encrypted.'));
        securityView(main);
      } catch (err) { formError(form, err); }
    });
  });
  const askCreds = async (title) => {
    const u = await confirmDialog({ title, text: L('Confirma con tu usuario actual.', 'Confirm with your current username.'), confirm: L('Siguiente', 'Next'), input: { label: L('Usuario', 'Username') } });
    if (!u) return null;
    const p = await confirmDialog({ title, text: L('Ahora tu contraseña actual.', 'Now your current password.'), confirm: L('Confirmar', 'Confirm'), input: { label: L('Contraseña', 'Password'), type: 'password', autocomplete: 'current-password' } });
    if (!p) return null;
    return [u, p];
  };
  main.querySelector('[data-off]')?.addEventListener('click', async () => {
    const c = await askCreds(L('Quitar el bloqueo', 'Remove lock'));
    if (!c) return;
    try { await E.disableLock(...c); toast(L('Bloqueo quitado.', 'Lock removed.')); securityView(main); } catch (err) { toast(err.message, { error: true }); }
  });
  main.querySelector('[data-change]')?.addEventListener('click', async () => {
    const c = await askCreds(L('Cambiar usuario o contraseña', 'Change username or password'));
    if (!c) return;
    if (!(await E.verifyLock(...c))) return toast(L('Usuario o contraseña incorrectos.', 'Incorrect username or password.'), { error: true });
    await E.disableLock(...c);
    toast(L('Escribe tu nuevo usuario y contraseña.', 'Enter your new username and password.'));
    securityView(main);
  });
  main.querySelector('[data-lock-now]')?.addEventListener('click', async () => { await E.flush(); location.reload(); });
}

// ---------- Respaldo en Google Sheets ----------
export function sheetsSection() {
  const cfg = sheetsConfig();
  return `<section class="glass card" style="margin-top:6px" data-sheets><h3>${icon('file')} Respaldo en Google Sheets</h3>
    ${cfg?.url ? `
      <div class="row wrap" style="gap:6px;margin-bottom:10px"><span class="chip mint">${icon('check')} Conectado</span>
        ${cfg.lastAt ? `<span class="chip gray">Último respaldo: ${esc(when(cfg.lastAt))}</span>` : '<span class="chip amber">Aún sin respaldo</span>'}
        ${cfg.lastError ? `<span class="chip rose">Último intento falló: ${esc(cfg.lastError)}</span>` : ''}</div>
      <label class="check"><input type="checkbox" data-auto ${cfg.auto ? 'checked' : ''}> Respaldar automáticamente después de cada cambio</label>
      <div class="stack" style="margin-top:12px">
        <button class="btn btn-primary" data-backup-now>${icon('upload')} Respaldar ahora</button>
        <button class="btn" data-restore-sheets>${icon('download')} Restaurar desde Google Sheets</button>
        <button class="btn btn-ghost" data-disconnect>Desconectar la hoja</button></div>
      ${hint('En tu hoja verás las pestañas Movimientos, Cuentas, Presupuesto, Facturas, Metas y Deudas. La pestaña oculta «_respaldo» guarda la copia completa para restaurar.')}`
    : `<p class="small muted" style="margin-top:0">Guarda una copia de tus datos en una hoja de Google de tu propia cuenta. Si cambias o pierdes el teléfono, la restauras con un toque.</p>
      <form class="stack" data-connect novalidate>
        <div class="field"><label for="gs-u">Dirección de la aplicación web (termina en /exec)</label><input class="input" id="gs-u" name="url" inputmode="url" autocapitalize="none" placeholder="https://script.google.com/macros/s/…/exec"></div>
        <div class="field"><label for="gs-k">Clave (la misma que pusiste en el Apps Script)</label><input class="input" id="gs-k" name="clave" type="password" autocomplete="off"></div>
        <button class="btn btn-primary" type="submit">${icon('link')} Conectar y probar</button>
        <button type="button" class="btn btn-ghost" data-restore-sheets>${icon('download')} Restaurar desde una hoja existente</button>
      </form>
      ${hint('Paso a paso: 1) crea una hoja nueva en Google Sheets; 2) Extensiones → Apps Script; 3) pega el código de JP Solution y cambia la CLAVE; 4) Implementar → Nueva implementación → Aplicación web, ejecutar como «Yo» y acceso «Cualquier usuario»; 5) copia la dirección aquí.')}
      <button class="btn btn-ghost btn-sm" data-copy-code style="margin-top:8px">${icon('copy')} Copiar el código del Apps Script</button>`}
  </section>`;
}

export function bindSheets(main, rerender) {
  const box = main.querySelector('[data-sheets]');
  if (!box) return;
  box.querySelector('[data-connect]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        clearFormError(form);
        const url = form.url.value.trim(), clave = form.clave.value;
        const r = await testConnection(url, clave);
        E.setSetting('sheets', { url, clave, auto: true, lastAt: null });
        toast(L(`Conectado a «${r.hoja}». Haciendo el primer respaldo…`, `Connected to “${r.hoja}”. Running the first backup…`));
        await backupNow();
        toast(L('Respaldo guardado en Google Sheets.', 'Backup saved to Google Sheets.'));
        rerender();
      } catch (err) { formError(form, err); }
    });
  });
  box.querySelector('[data-auto]')?.addEventListener('change', (e) => { E.setSetting('sheets', { ...sheetsConfig(), auto: e.target.checked }); });
  box.querySelector('[data-backup-now]')?.addEventListener('click', (e) => busy(e.currentTarget, async () => {
    try { await backupNow(); toast(L('Respaldo guardado en Google Sheets.', 'Backup saved to Google Sheets.')); } catch (err) { toast(err.message, { error: true }); }
    rerender();
  }));
  box.querySelector('[data-disconnect]')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: L('Desconectar la hoja', 'Disconnect sheet'), text: L('Se dejará de respaldar. La hoja y su contenido siguen en tu Google Drive.', 'Backups will stop. The sheet and its contents stay in your Google Drive.'), confirm: L('Desconectar', 'Disconnect') });
    if (!ok) return;
    E.setSetting('sheets', null); rerender();
  });
  box.querySelector('[data-copy-code]')?.addEventListener('click', async () => {
    try {
      const code = await (await fetch('./apps-script/Codigo.gs')).text();
      await navigator.clipboard.writeText(code);
      toast(L('Código copiado. Pégalo en Apps Script.', 'Code copied. Paste it into Apps Script.'));
    } catch { toast(L('No se pudo copiar. Abre la guía para verlo.', 'Couldn’t copy. Open the guide to see it.'), { error: true }); }
  });
  box.querySelectorAll('[data-restore-sheets]').forEach((b) => b.addEventListener('click', async () => {
    let cfg = sheetsConfig();
    let url = cfg?.url, clave = cfg?.clave;
    if (!url) {
      const form = box.querySelector('[data-connect]');
      url = form?.url.value.trim(); clave = form?.clave.value;
      if (!url || !clave) return toast(L('Escribe la dirección y la clave de tu hoja.', 'Enter your sheet’s address and key.'), { error: true });
    }
    try {
      const { fecha, backup } = await fetchRemoteBackup(url, clave);
      const n = backup.households?.reduce((s, h) => s + (h.data?.transactions?.length || 0), 0) || 0;
      const ok = await confirmDialog({ title: L('Restaurar desde Google Sheets', 'Restore from Google Sheets'),
        text: L(`Respaldo del ${esc(when(fecha))} con ${n} movimientos. Los datos actuales de esos hogares en este teléfono se reemplazarán.`, `Backup from ${esc(when(fecha))} with ${n} transactions. Current data for those households on this phone will be replaced.`),
        confirm: L('Restaurar', 'Restore'), danger: true });
      if (!ok) return;
      const r = await E.restoreFull(backup);
      if (!cfg?.url) E.setSetting('sheets', { url, clave, auto: true, lastAt: fecha });
      toast(L(`Listo: se restauraron ${r.households} hogar(es).`, `Done: ${r.households} household(s) restored.`));
      localStorage.removeItem('jp-hid');
      location.hash = '#/inicio'; location.reload();
    } catch (err) { toast(err.message, { error: true }); }
  }));
}

// ---------- Archivo de respaldo y borrado ----------
export function fileBackupSection() {
  return `<section class="glass card" style="margin-top:14px"><h3>${icon('download')} Archivo de respaldo</h3>
    <div class="stack"><button class="btn" data-file-backup>${icon('download')} Descargar respaldo (.json)</button>
      <div class="field"><label for="fr">Restaurar desde un archivo</label><input class="input" id="fr" type="file" accept=".json,application/json"></div>
      ${hint('Útil para guardar una copia extra en Drive, en el correo o en la computadora.')}</div></section>
    <section class="glass card" style="margin-top:14px"><h3>${icon('lock')} Dónde se guardan tus datos</h3>
      <div class="small stack" style="gap:6px"><div>Solo en este teléfono, dentro del almacenamiento privado de la app. No se envían a ningún servidor de JP Solution.</div>
        <div>Si conectas Google Sheets, se guarda una copia en tu propia cuenta de Google.</div>
        <div>Si activas el bloqueo, la información queda cifrada con tu usuario y contraseña.</div></div></section>
    <section class="glass card" style="margin-top:14px"><h3>${icon('trash')} Borrar todo</h3>
      <button class="btn btn-ghost" data-wipe style="color:var(--neg)">Borrar todos los datos de este teléfono</button></section>`;
}
export function bindFileBackup(main) {
  main.querySelector('[data-file-backup]')?.addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const b = await E.fullBackup();
    download(`jp-solution-respaldo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b));
  }));
  main.querySelector('#fr')?.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const backup = JSON.parse(await f.text());
      const ok = await confirmDialog({ title: L('Restaurar respaldo', 'Restore backup'), text: L('Los datos actuales de los hogares del archivo se reemplazarán.', 'Current data for the households in the file will be replaced.'), confirm: L('Restaurar', 'Restore'), danger: true });
      if (!ok) return;
      const r = await E.restoreFull(backup);
      toast(L(`Listo: se restauraron ${r.households} hogar(es).`, `Done: ${r.households} household(s) restored.`));
      location.hash = '#/inicio'; location.reload();
    } catch (err) { toast(err.message || L('El archivo no es válido.', 'Invalid file.'), { error: true }); }
  });
  main.querySelector('[data-wipe]')?.addEventListener('click', async () => {
    const v = await confirmDialog({ title: L('Borrar todos los datos', 'Erase all data'), text: L('Se borrará todo lo guardado en este teléfono. Tu hoja de Google Sheets no se toca.', 'Everything saved on this phone will be erased. Your Google Sheet is not affected.'),
      confirm: L('Borrar todo', 'Erase everything'), danger: true, input: { label: L('Escribe BORRAR para confirmar', 'Type BORRAR to confirm') } });
    if (String(v).trim().toUpperCase() !== 'BORRAR') return;
    await E.wipeAll(); localStorage.removeItem('jp-hid'); location.hash = '#/inicio'; location.reload();
  });
}
