// Respaldo en Google Sheets mediante un Apps Script publicado por la propia persona en su cuenta de Google.
// Se envía el respaldo completo (para restaurar) y pestañas legibles: Movimientos, Cuentas, Presupuesto, Facturas, Metas y Deudas.
import { fullBackup, getSetting, setSetting, onMutation, request } from './engine.js';
import { deviceInfo, conflictWith } from './sync-check.js';

// Otro dispositivo guardó en la hoja después de nuestra última sincronización: hay que preguntar.
export class SheetsConflict extends Error {
  constructor(info) { super(`Otro dispositivo (${info.nombre}) guardó datos en la hoja. Elige qué hacer antes de respaldar.`); this.info = info; }
}

const TYPE = { income: 'Ingreso', expense: 'Gasto', refund: 'Devolución', transfer: 'Transferencia' };
const ACC = { cash: 'Efectivo', bank: 'Cuenta bancaria', savings: 'Ahorros', credit: 'Tarjeta de crédito' };
const FREQ = { once: 'Una vez', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual' };
// Evita que un texto que empieza con = + - @ se interprete como fórmula en la hoja.
const safe = (v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v ?? '');
const money = (c) => Math.round(c) / 100;

export const sheetsConfig = () => getSetting('sheets');

async function call(url, payload) {
  let r;
  try {
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
  } catch {
    throw new Error('No hay conexión con Google. Revisa tu internet.');
  }
  let j;
  try { j = await r.json(); } catch { throw new Error('Google no respondió como se esperaba. Revisa que la dirección sea la del Apps Script publicado.'); }
  if (!j.ok) throw new Error(j.error === 'Clave incorrecta' ? 'La clave no coincide con la del Apps Script.' : (j.error || 'Google rechazó la solicitud.'));
  return j;
}

export async function testConnection(url, clave) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) throw new Error('La dirección debe ser la de la aplicación web del Apps Script (termina en /exec).');
  return call(url, { accion: 'probar', clave });
}

async function buildTables(backup) {
  const t = {
    Movimientos: [['Fecha', 'Tipo', 'Descripción', 'Importe (USD)', 'Cuenta', 'Hacia la cuenta', 'Categorías', 'Integrante', 'Comercio', 'Notas', 'Hogar']],
    Cuentas: [['Hogar', 'Cuenta', 'Tipo', 'Saldo actual (USD)', 'Archivada']],
    Presupuesto: [['Hogar', 'Mes', 'Categoría', 'Presupuesto (USD)', 'Acumula sobrante']],
    Facturas: [['Hogar', 'Factura', 'Importe (USD)', 'Frecuencia', 'Primer vencimiento', 'Activa']],
    Metas: [['Hogar', 'Meta', 'Objetivo (USD)', 'Ahorrado (USD)', 'Avance %', 'Fecha objetivo']],
    Deudas: [['Hogar', 'Deuda', 'Saldo (USD)', 'Pago mensual (USD)', 'Pagos hechos', 'Total de pagos', 'Pagos restantes']],
  };
  for (const hb of backup.households) {
    const hh = hb.household, d = hb.data, H = hh.name;
    const acc = Object.fromEntries(d.accounts.map((a) => [a.id, a.name]));
    const cat = Object.fromEntries(d.categories.map((c) => [c.id, c.name]));
    const who = Object.fromEntries([...hb.members.map((m) => [m.id, m.name]), ...(d.people || []).map((p) => [p.id, p.name])]);
    const splits = {};
    d.splits.forEach((s) => (splits[s.transaction_id] ||= []).push(s));
    d.transactions.filter((x) => !x.deleted_at).sort((a, b) => b.date.localeCompare(a.date)).forEach((x) => {
      t.Movimientos.push([x.date, TYPE[x.type], safe(x.description), money(x.type === 'expense' ? -x.amount : x.amount), safe(acc[x.account_id]), safe(acc[x.to_account_id] || ''),
        safe((splits[x.id] || []).map((s) => cat[s.category_id]).join(', ')), safe(who[x.member_id] || ''), safe(x.merchant || ''), safe(x.notes || ''), safe(H)]);
    });
    const [accounts, goals, debts] = await Promise.all(['/accounts', '/goals', '/debts'].map((p) => request('GET', `/h/${hh.id}${p}`)));
    (accounts.data || []).forEach((a) => t.Cuentas.push([safe(H), safe(a.name), ACC[a.type], money(a.balance), a.archived ? 'Sí' : 'No']));
    d.budgets.forEach((b) => t.Presupuesto.push([safe(H), b.month, safe(b.category_id ? cat[b.category_id] : 'General'), money(b.amount), b.rollover ? 'Sí' : 'No']));
    d.bills.forEach((b) => t.Facturas.push([safe(H), safe(b.name), money(b.amount), FREQ[b.frequency], b.first_due, b.active ? 'Sí' : 'No']));
    (goals.data || []).forEach((g) => t.Metas.push([safe(H), safe(g.name), money(g.target), money(g.saved), g.pct, g.target_date || '']));
    (debts.data || []).forEach((x) => t.Deudas.push([safe(H), safe(x.name), money(x.balance), money(x.min_payment), x.paymentsMade, x.total_payments || '', x.paymentsLeft ?? '']));
  }
  return t;
}

let running = null;
// force = true solo cuando la persona eligió reemplazar la hoja con los datos de este dispositivo.
export async function backupNow({ force = false } = {}) {
  const cfg = sheetsConfig();
  if (!cfg?.url) throw new Error('Primero conecta tu hoja de Google.');
  if (running) return running;
  running = (async () => {
    try {
      const device = deviceInfo();
      if (!force) {
        const remote = await call(cfg.url, { accion: 'estado', clave: cfg.clave }).catch((e) => {
          if (/desconocida/.test(e.message)) throw new Error('Actualiza el código del Apps Script de tu hoja (hay una versión nueva) y vuelve a implementarlo.');
          throw e;
        });
        const conflict = conflictWith(remote, cfg, device.id);
        if (conflict) {
          setSetting('sheets', { ...sheetsConfig(), conflict, lastError: null });
          throw new SheetsConflict(conflict);
        }
      }
      const backup = await fullBackup();
      const tablas = await buildTables(backup);
      const r = await call(cfg.url, { accion: 'respaldar', clave: cfg.clave, respaldo: JSON.stringify(backup), tablas, dispositivo: { id: device.id, nombre: device.name } });
      setSetting('sheets', { ...sheetsConfig(), lastAt: new Date().toISOString(), lastRemoteAt: r.fecha, conflict: null, lastError: null });
      return r;
    } catch (e) {
      if (!(e instanceof SheetsConflict)) setSetting('sheets', { ...sheetsConfig(), lastError: e.message, lastErrorAt: new Date().toISOString() });
      throw e;
    } finally { running = null; }
  })();
  return running;
}

export async function fetchRemoteBackup(url, clave) {
  const r = await call(url, { accion: 'restaurar', clave });
  try { return { fecha: r.fecha, nombre: r.nombre, backup: JSON.parse(r.respaldo) }; } catch { throw new Error('El respaldo guardado en la hoja está incompleto.'); }
}

// Respaldo automático: unos segundos después del último cambio, si hay conexión.
let timer = null;
onMutation(() => {
  const cfg = sheetsConfig();
  if (!cfg?.url || !cfg.auto || cfg.conflict) return;   // con conflicto pendiente no se respalda solo
  clearTimeout(timer);
  timer = setTimeout(() => { if (navigator.onLine) backupNow().catch(() => {}); }, 15000);
});
window.addEventListener('online', () => {
  const cfg = sheetsConfig();
  if (cfg?.url && cfg.auto && cfg.lastError && !cfg.conflict) backupNow().catch(() => {});
});
