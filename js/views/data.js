// Importación CSV (con vista previa, columnas, validación y duplicados) y respaldo/restauración.
import { get, post, del } from '../api.js';
import { S, H, isAdmin, activeAccounts, changed, today } from '../store.js';
import { icon, esc, money, hint, busy, toast, confirmDialog, download, parseMoney, fmtDate } from '../ui.js';
import { exportCsv } from './transactions.js';
import { LOCAL } from '../mode.js';

// ---------- CSV ----------
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delim = [';', '\t', ','].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function parseDate(s, fmt) {
  s = String(s || '').trim();
  let y, m, d;
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const other = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (iso && fmt !== 'dmy' && fmt !== 'mdy') [, y, m, d] = iso;
  else if (other) {
    const [, a, b, c] = other;
    y = c.length === 2 ? '20' + c : c;
    if (fmt === 'mdy') { m = a; d = b; } else { d = a; m = b; }
  } else return null;
  const out = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dt = new Date(out + 'T00:00:00Z');
  return !isNaN(dt) && dt.toISOString().slice(0, 10) === out ? out : null;
}
function parseSigned(s) {
  s = String(s || '').trim();
  if (!s) return null;
  const neg = /^-|^\(.*\)$|-$/.test(s) || /^−/.test(s);
  const v = parseMoney(s);
  if (Number.isNaN(v)) return NaN;
  return neg ? -v : v;
}

const guess = (headers, words) => headers.findIndex((h) => words.some((w) => h.toLowerCase().includes(w)));

export async function importView(main) {
  const accs = activeAccounts();
  const st = { rows: null, headers: [], account: accs[0]?.id, map: {}, fmt: 'auto', invert: false, checked: null, result: null };
  main.innerHTML = `
    <section class="glass card" style="margin-top:6px">
      <h3>${icon('upload')} Importar movimientos desde CSV</h3>
      <p class="small muted" style="margin-top:0">Descarga el estado de cuenta de tu banco en formato CSV y súbelo aquí. Verás una vista previa antes de guardar nada.</p>
      ${accs.length ? `<div class="stack">
        <div class="field"><label for="im-a">Cuenta a la que pertenecen los movimientos</label><select class="input" id="im-a">${accs.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="im-f">Archivo CSV</label><input class="input" id="im-f" type="file" accept=".csv,text/csv,text/plain"></div>
      </div>` : `<p>Primero crea una cuenta en <a href="#/cuentas">Cuentas y tarjetas</a>.</p>`}
    </section>
    <div data-step></div>
    ${hint('Conexión bancaria automática: no está activada. Cuando se agregue, deberá usar un proveedor autorizado (por ejemplo Plaid, Belvo o un agregador regulado de tu país) con autorización explícita y sin guardar contraseñas bancarias en la app.')}`;
  if (!accs.length) return;
  const step = main.querySelector('[data-step]');
  main.querySelector('#im-a').onchange = (e) => { st.account = e.target.value; };
  main.querySelector('#im-f').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5_000_000) return toast('El archivo es demasiado grande (máximo 5 MB).', { error: true });
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return toast('El archivo no tiene filas para importar.', { error: true });
    st.headers = rows[0].map((h, i) => h.trim() || `Columna ${i + 1}`);
    st.rows = rows.slice(1);
    st.map = {
      date: guess(st.headers, ['fecha', 'date']),
      description: guess(st.headers, ['descrip', 'concepto', 'detalle', 'description', 'memo']),
      amount: guess(st.headers, ['importe', 'monto', 'amount', 'valor', 'cantidad']),
      debit: guess(st.headers, ['cargo', 'débito', 'debito', 'retiro', 'debit']),
      credit: guess(st.headers, ['abono', 'crédito', 'credito', 'depósito', 'deposito', 'credit']),
      category: guess(st.headers, ['categor']),
      merchant: guess(st.headers, ['comercio', 'merchant', 'establecimiento']),
    };
    if (st.map.amount >= 0) { st.map.debit = -1; st.map.credit = -1; }
    drawMapping();
  };

  const colSel = (key, label, optional = true) => `<div class="field"><label>${label}</label><select class="input" data-map="${key}">
    ${optional ? '<option value="-1">— No usar —</option>' : ''}${st.headers.map((h, i) => `<option value="${i}" ${st.map[key] === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>`;

  function buildRows() {
    return st.rows.map((r) => {
      const get = (k) => (st.map[k] >= 0 ? r[st.map[k]] : '');
      let amount = null;
      if (st.map.amount >= 0) amount = parseSigned(get('amount'));
      else {
        const dbt = parseSigned(get('debit')), cdt = parseSigned(get('credit'));
        amount = (cdt ? Math.abs(cdt) : 0) - (dbt ? Math.abs(dbt) : 0);
      }
      if (st.invert && Number.isInteger(amount)) amount = -amount;
      return { date: parseDate(get('date'), st.fmt) || String(get('date')), amount: Number.isInteger(amount) ? amount : 0,
        description: get('description'), category_name: get('category'), merchant: get('merchant') };
    });
  }

  function drawMapping() {
    step.innerHTML = `<section class="glass card" style="margin-top:14px">
      <h3>Asigna las columnas</h3>
      <div class="small muted" style="margin-bottom:10px">${st.rows.length} filas encontradas. Indica qué columna corresponde a cada dato.</div>
      <div class="grid cols-2">
        ${colSel('date', 'Fecha', false)}
        <div class="field"><label>Formato de fecha</label><select class="input" data-fmt><option value="auto">Detectar (AAAA-MM-DD o DD/MM/AAAA)</option><option value="dmy" ${st.fmt === 'dmy' ? 'selected' : ''}>DD/MM/AAAA</option><option value="mdy" ${st.fmt === 'mdy' ? 'selected' : ''}>MM/DD/AAAA</option></select></div>
        ${colSel('description', 'Descripción')}
        ${colSel('amount', 'Importe (con signo)')}
        ${colSel('debit', 'O bien: columna de cargos')}
        ${colSel('credit', 'O bien: columna de abonos')}
        ${colSel('category', 'Categoría (opcional)')}
        ${colSel('merchant', 'Comercio (opcional)')}
      </div>
      <label class="check" style="margin-top:10px"><input type="checkbox" data-invert ${st.invert ? 'checked' : ''}> Mi banco muestra los gastos como números positivos (invertir signos)</label>
      ${hint('Gastos = importes negativos; ingresos = positivos. Si una categoría del archivo no existe, se usará «Otros gastos» u «Otros ingresos».')}
      <button class="btn btn-primary btn-block" style="margin-top:12px" data-preview>Ver vista previa</button></section>`;
    step.querySelectorAll('[data-map]').forEach((s) => (s.onchange = () => { st.map[s.dataset.map] = Number(s.value); }));
    step.querySelector('[data-fmt]').onchange = (e) => { st.fmt = e.target.value; };
    step.querySelector('[data-invert]').onchange = (e) => { st.invert = e.target.checked; };
    step.querySelector('[data-preview]').onclick = (e) => busy(e.currentTarget, preview);
  }

  async function preview() {
    if (st.map.date < 0) return toast('Elige la columna de fecha.', { error: true });
    if (st.map.amount < 0 && st.map.debit < 0 && st.map.credit < 0) return toast('Elige la columna de importe o las de cargos y abonos.', { error: true });
    const rows = buildRows();
    let checked;
    try { checked = await post(H('/import/check'), { account_id: st.account, rows }); }
    catch (err) { return toast(err.message, { error: true }); }
    st.checked = checked;
    const include = new Set(checked.filter((r) => !r.errors.length && !r.duplicate && !r.duplicateInFile).map((r) => r.index));
    const counts = { ok: include.size, dup: checked.filter((r) => r.duplicate || r.duplicateInFile).length, err: checked.filter((r) => r.errors.length).length };
    step.innerHTML = `<section class="glass card" style="margin-top:14px">
      <h3>Vista previa</h3>
      <div class="row wrap" style="gap:8px;margin-bottom:10px"><span class="chip mint">${counts.ok} listas</span><span class="chip amber">${counts.dup} posibles duplicados</span><span class="chip rose">${counts.err} con errores</span></div>
      ${hint('Los posibles duplicados (mismo importe y fecha cercana en esta cuenta, o repetidos en el archivo) quedan desmarcados. Márcalos si quieres importarlos de todos modos.')}
      <div class="table-wrap" style="max-height:420px;overflow:auto;margin-top:10px"><table class="data-table"><thead><tr><th></th><th>Fecha</th><th>Descripción</th><th>Categoría</th><th class="n">Importe</th><th>Estado</th></tr></thead><tbody>
      ${checked.map((r) => `<tr><td><input type="checkbox" data-row="${r.index}" ${include.has(r.index) ? 'checked' : ''} ${r.errors.length ? 'disabled' : ''} aria-label="Importar fila ${r.index + 1}"></td>
        <td>${esc(r.date)}</td><td>${esc(r.description)}</td><td>${esc(r.category_name || '')}</td>
        <td class="n ${r.type === 'expense' ? 'neg' : 'pos'}">${r.errors.length ? '—' : money(r.type === 'expense' ? -r.amount : r.amount)}</td>
        <td>${r.errors.length ? `<span class="chip rose">${esc(r.errors.join(', '))}</span>` : r.duplicate ? `<span class="chip amber" title="${esc(r.duplicate.description)}">Ya existe (${esc(r.duplicate.date)})</span>` : r.duplicateInFile ? '<span class="chip amber">Repetida en el archivo</span>' : '<span class="chip mint">Lista</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="grid-2" style="margin-top:12px"><button class="btn" data-back>Cambiar columnas</button><button class="btn btn-primary" data-commit>Importar seleccionadas</button></div></section>`;
    step.querySelector('[data-back]').onclick = drawMapping;
    step.querySelector('[data-commit]').onclick = (e) => busy(e.currentTarget, async () => {
      const selected = new Set([...step.querySelectorAll('[data-row]:checked')].map((x) => Number(x.dataset.row)));
      if (!selected.size) return toast('No hay filas seleccionadas.', { error: true });
      const skip = checked.map((r) => r.index).filter((i) => !selected.has(i));
      try {
        const r = await post(H('/import/commit'), { account_id: st.account, rows, skip });
        step.innerHTML = `<section class="glass card" style="margin-top:14px"><h3>${icon('check')} Importación completa</h3>
          <p>Se importaron <b>${r.count}</b> movimientos.</p>
          <div class="row wrap"><a class="btn btn-primary" href="#/movimientos">Ver movimientos</a><button class="btn" data-undo="${r.batch}">${icon('undo')} Deshacer importación</button></div></section>`;
        step.querySelector('[data-undo]').onclick = (ev) => busy(ev.currentTarget, async () => {
          const ok = await confirmDialog({ title: 'Deshacer importación', text: `Se eliminarán los ${r.count} movimientos de esta importación.`, confirm: 'Deshacer', danger: true });
          if (!ok) return;
          try { const u = await del(H(`/import/${r.batch}`)); toast(`Se quitaron ${u.removed} movimientos.`); await changed(); importView(main); } catch (err) { toast(err.message, { error: true }); }
        });
        await changed();
      } catch (err) { toast(err.message, { error: true }); }
    });
  }
}

// ---------- Respaldo ----------
export async function backupView(main) {
  if (LOCAL) {
    const P = await import('../local/ui.js');
    const draw = () => {
      main.innerHTML = P.sheetsSection() + `<section class="glass card" style="margin-top:14px"><h3>${icon('download')} Exportar</h3>
        <button class="btn btn-block" data-csv>${icon('file')} Todos los movimientos en CSV</button></section>` + P.fileBackupSection();
      P.bindSheets(main, draw); P.bindFileBackup(main);
      main.querySelector('[data-csv]').onclick = (e) => exportCsv(e.currentTarget, ['1900-01-01', '2999-12-31']);
    };
    draw();
    return;
  }
  const admin = isAdmin();
  main.innerHTML = `
    <section class="glass card" style="margin-top:6px"><h3>${icon('lock')} Dónde se guardan tus datos</h3>
      <div class="small stack" style="gap:6px">
        <div>Los datos del hogar se guardan en el servidor de JP Solution, en una base de datos SQLite (archivo <code>data/jp-solution.db</code>).</div>
        <div>Solo los integrantes del hogar pueden verlos: el servidor comprueba el permiso en cada consulta. Las contraseñas se guardan cifradas (scrypt) y la sesión usa una cookie protegida.</div>
        <div>En este dispositivo solo se recuerdan preferencias (tema, última cuenta usada), nunca tus movimientos.</div></div></section>

    <section class="glass card" style="margin-top:14px"><h3>${icon('download')} Exportar</h3>
      <div class="stack">
        <button class="btn" data-csv>${icon('file')} Todos los movimientos en CSV</button>
        ${admin ? `<button class="btn btn-primary" data-backup>${icon('download')} Descargar respaldo completo</button>
          ${hint('El respaldo (JSON) contiene: datos del hogar, nombres y correos de los integrantes (sin contraseñas), cuentas, categorías, movimientos con divisiones y comprobantes, recurrentes, presupuestos, facturas y pagos, metas, deudas y sus pagos.')}`
          : hint('El respaldo completo y la restauración están disponibles para administradores.')}
        <a class="btn btn-ghost" href="#/perfil">${icon('settings')} Exportar mis datos personales o eliminar mi cuenta</a>
      </div></section>

    ${admin ? `<section class="glass card" style="margin-top:14px"><h3>${icon('upload')} Restaurar respaldo</h3>
      <div class="stack">
        <div class="field"><label for="rb-f">Archivo de respaldo (.json)</label><input class="input" id="rb-f" type="file" accept=".json,application/json"></div>
        <label class="check"><input type="radio" name="mode" value="merge" checked> <span><b>Combinar:</b> agrega lo que falta y conserva lo que ya existe</span></label>
        <label class="check"><input type="radio" name="mode" value="replace"> <span><b>Reemplazar:</b> borra los datos financieros actuales del hogar y deja solo los del respaldo</span></label>
        ${hint('Conflictos: si un registro del respaldo ya existe en el hogar, se conserva la versión actual. Restaurar dos veces el mismo respaldo no duplica datos. Si el respaldo viene de otro hogar, se copian sus datos con identificadores nuevos. Los integrantes no se crean: lo registrado por personas que no están en este hogar queda a tu nombre.')}
        <button class="btn btn-primary" data-restore>Restaurar</button>
      </div></section>` : ''}

    <section class="glass card" style="margin-top:14px"><h3>${icon('bank')} Conexión bancaria</h3>
      <p class="small" style="margin:0">Por ahora la app funciona con registro manual e importación de archivos CSV. Una conexión bancaria futura deberá usar un proveedor autorizado, con tu permiso explícito y sin guardar contraseñas bancarias en la aplicación.</p></section>`;

  main.querySelector('[data-csv]').onclick = (e) => exportCsv(e.currentTarget, ['1900-01-01', '2999-12-31']);
  main.querySelector('[data-backup]')?.addEventListener('click', (e) => busy(e.currentTarget, async () => {
    try { const b = await get(H('/backup')); download(`jp-solution-respaldo-${S.h.name.replace(/[^\w-]+/g, '-')}-${today()}.json`, JSON.stringify(b)); toast('Respaldo descargado.'); }
    catch (err) { toast(err.message, { error: true }); }
  }));
  main.querySelector('[data-restore]')?.addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const file = main.querySelector('#rb-f').files[0];
    if (!file) return toast('Elige un archivo de respaldo.', { error: true });
    let backup;
    try { backup = JSON.parse(await file.text()); } catch { return toast('El archivo no es un JSON válido.', { error: true }); }
    if (backup.app !== 'JP Solution' || backup.kind !== 'backup') return toast('El archivo no es un respaldo de JP Solution.', { error: true });
    const mode = main.querySelector('[name=mode]:checked').value;
    const n = backup.data?.transactions?.length || 0;
    const ok = await confirmDialog({ title: mode === 'replace' ? 'Reemplazar datos' : 'Combinar respaldo',
      text: `Respaldo de «${esc(backup.household?.name)}» del ${esc(fmtDate(String(backup.exported_at).slice(0, 10)))} con ${n} movimientos. ${mode === 'replace' ? 'Los datos financieros actuales de este hogar se borrarán.' : 'Se agregarán los registros que no existan.'}`,
      confirm: mode === 'replace' ? 'Reemplazar' : 'Combinar', danger: mode === 'replace' });
    if (!ok) return;
    try {
      const r = await post(H('/restore'), { backup, mode });
      toast(`Restauración completa: ${r.stats.transactions || 0} movimientos, ${r.stats.accounts || 0} cuentas agregadas.`);
      await changed();
    } catch (err) { toast(err.message, { error: true }); }
  }));
}
