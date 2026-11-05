// Motor de la versión personal: ejecuta las mismas reglas de la API (core/app.js) dentro del teléfono,
// sobre una base de datos SQLite (sql.js) que se guarda en el almacenamiento del navegador.
import { createApp } from '../core/app.js';
import { applySchema } from '../core/schema.js';
import { kvGet, kvSet, deriveKey, encrypt, decrypt, askPersistence } from './store.js';

const LOCAL_USER = 'local-user';
let SQL = null, sqldb = null, app = null, user = null;
let lockKey = null;          // clave de cifrado en memoria mientras la app está desbloqueada
let saveTimer = null, saving = Promise.resolve();
const listeners = new Set();
export const onMutation = (fn) => listeners.add(fn);

// Adaptador: misma forma que node:sqlite (prepare().get/all/run y exec) sobre sql.js.
function adapt(db) {
  const norm = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  return {
    exec: (sql) => db.exec(sql),
    prepare(sql) {
      return {
        get(...p) { const st = db.prepare(sql); try { st.bind(norm(p)); return st.step() ? st.getAsObject() : undefined; } finally { st.free(); } },
        all(...p) { const st = db.prepare(sql); const out = []; try { st.bind(norm(p)); while (st.step()) out.push(st.getAsObject()); return out; } finally { st.free(); } },
        run(...p) { const st = db.prepare(sql); try { st.bind(norm(p)); st.step(); } finally { st.free(); } return { changes: db.getRowsModified() }; },
      };
    },
  };
}

const platform = {
  hashPassword: () => '-', verifyPassword: () => false,
  sha256: (s) => s, randomToken: () => crypto.randomUUID(), sendMail: async () => false,
};

async function loadSql() {
  if (!SQL) SQL = await window.initSqlJs({ locateFile: (f) => new URL(`./js/vendor/${f}`, document.baseURI).href });
  return SQL;
}

function openFromBytes(bytes) {
  sqldb = bytes ? new SQL.Database(bytes) : new SQL.Database();
  const db = adapt(sqldb);
  db.exec('PRAGMA foreign_keys = ON;');
  applySchema(db);
  db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)');
  // Persona única del teléfono (sin contraseña: el bloqueo es del dispositivo, ver lock).
  if (!db.prepare('SELECT 1 FROM users WHERE id=?').get(LOCAL_USER)) {
    db.prepare('INSERT INTO users (id, email, name, pass_hash, created_at) VALUES (?,?,?,?,?)').run(LOCAL_USER, 'yo@este-telefono', 'Yo', '-', new Date().toISOString());
  }
  app = createApp(db, platform);
  user = db.prepare('SELECT * FROM users WHERE id=?').get(LOCAL_USER);
  return db;
}

// Arranque: 'locked' si hace falta usuario y contraseña; 'ready' si ya se puede usar.
export async function init() {
  await loadSql();
  askPersistence();
  const lock = await kvGet('lock');
  if (lock) return 'locked';
  const stored = await kvGet('db');
  openFromBytes(stored?.plain || null);
  return 'ready';
}
export const isLockEnabled = async () => !!(await kvGet('lock'));
export async function lockInfo() { const l = await kvGet('lock'); return l ? { username: l.username } : null; }

export async function unlock(username, password) {
  const lock = await kvGet('lock');
  if (!lock) return true;
  if (username.trim().toLowerCase() !== lock.username.toLowerCase()) { await new Promise((r) => setTimeout(r, 600)); return false; }
  const key = await deriveKey(username, password, lock.salt);
  const stored = await kvGet('db');
  try {
    const bytes = stored?.enc ? await decrypt(key, stored.enc) : null;
    lockKey = key;
    openFromBytes(bytes);
    return true;
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    return false;
  }
}

async function persist() {
  if (!sqldb) return;
  const bytes = sqldb.export();
  sqldb.exec('PRAGMA foreign_keys = ON;');   // export() lo desactiva
  if (lockKey) await kvSet('db', { enc: await encrypt(lockKey, bytes), at: Date.now() });
  else await kvSet('db', { plain: bytes, at: Date.now() });
}
export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saving = saving.then(persist).catch((e) => console.error('No se pudo guardar', e)); }, 250);
}
export async function flush() {
  clearTimeout(saveTimer);
  saving = saving.then(persist);
  await saving;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && sqldb) flush(); });

// Activar, cambiar o quitar el bloqueo.
export async function enableLock(username, password) {
  username = String(username || '').trim();
  if (username.length < 3) throw new Error('El usuario debe tener al menos 3 caracteres.');
  if (String(password || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  lockKey = await deriveKey(username, password, salt);
  await kvSet('lock', { username, salt, createdAt: Date.now() });
  await flush();
}
export async function verifyLock(username, password) {
  const lock = await kvGet('lock');
  if (!lock) return true;
  if (username.trim().toLowerCase() !== lock.username.toLowerCase()) return false;
  const stored = await kvGet('db');
  try { await decrypt(await deriveKey(username, password, lock.salt), stored.enc); return true; } catch { return false; }
}
export async function disableLock(username, password) {
  if (!(await verifyLock(username, password))) throw new Error('Usuario o contraseña incorrectos.');
  lockKey = null;
  await kvSet('lock', undefined);
  await flush();
}
// Olvidé la contraseña: borra los datos del teléfono para empezar de nuevo (luego se puede restaurar el respaldo).
export async function wipeAll() {
  await kvSet('db', undefined);
  await kvSet('lock', undefined);
  lockKey = null; sqldb = null;
}

// ---------- API local ----------
export async function request(method, path, body) {
  if (!app) throw Object.assign(new Error('La app está bloqueada.'), { status: 401 });
  const url = new URL('/api' + path, 'http://local');
  const out = await app.handle({
    method, pathname: url.pathname, query: Object.fromEntries(url.searchParams),
    body: body === undefined ? {} : JSON.parse(JSON.stringify(body)),
    req: { headers: {}, socket: {} }, res: { setHeader() {} }, user,
  });
  if (out.status === 200 && method !== 'GET') { scheduleSave(); listeners.forEach((fn) => fn()); }
  return out;
}

// ---------- Ajustes guardados dentro de la base (van cifrados si hay bloqueo) ----------
export function getSetting(key) {
  if (!sqldb) return null;
  const r = adapt(sqldb).prepare('SELECT value FROM app_settings WHERE key=?').get(key);
  return r ? JSON.parse(r.value) : null;
}
export function setSetting(key, value) {
  adapt(sqldb).prepare('INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value));
  scheduleSave();
}

// ---------- Respaldo completo de todos los hogares (sin la demostración) ----------
export async function fullBackup({ includeDemo = false } = {}) {
  const db = adapt(sqldb);
  const hhs = db.prepare('SELECT id, is_demo FROM households').all().filter((h) => includeDemo || !h.is_demo);
  const households = [];
  for (const h of hhs) {
    const r = await request('GET', `/h/${h.id}/backup`);
    if (r.status === 200) households.push(r.data);
  }
  return { app: 'JP Solution', kind: 'personal-backup', version: 1, exported_at: new Date().toISOString(), households };
}

export async function restoreFull(backup) {
  if (!backup || backup.app !== 'JP Solution') throw new Error('El archivo no es un respaldo de JP Solution.');
  const list = backup.kind === 'personal-backup' ? backup.households : backup.kind === 'backup' ? [backup] : null;
  if (!list) throw new Error('El archivo no es un respaldo de JP Solution.');
  const db = adapt(sqldb);
  let count = 0;
  for (const hb of list) {
    const h = hb.household;
    if (!db.prepare('SELECT 1 FROM households WHERE id=?').get(h.id)) {
      db.prepare('INSERT INTO households (id, name, currency, timezone, start_day, is_demo, created_at) VALUES (?,?,?,?,?,?,?)')
        .run(h.id, h.name, 'USD', h.timezone, h.start_day, h.is_demo || 0, h.created_at || new Date().toISOString());
    }
    if (!db.prepare('SELECT 1 FROM members WHERE household_id=? AND user_id=?').get(h.id, LOCAL_USER)) {
      db.prepare('INSERT INTO members (household_id, user_id, role, color, joined_at) VALUES (?,?,?,?,?)').run(h.id, LOCAL_USER, 'admin', '#8b7cf6', new Date().toISOString());
    }
    const r = await request('POST', `/h/${h.id}/restore`, { backup: hb, mode: 'replace' });
    if (r.status !== 200) throw new Error(r.data.error);
    count += r.data.stats?.transactions || 0;
  }
  await flush();
  return { households: list.length, transactions: count };
}
