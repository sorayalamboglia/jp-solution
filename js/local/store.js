// Almacenamiento del teléfono (IndexedDB) y cifrado opcional con usuario y contraseña.
// La base de datos completa se guarda como un solo bloque; si el bloqueo está activo, va cifrada con AES-GCM
// usando una clave derivada (PBKDF2, 310 000 vueltas) del usuario y la contraseña. Sin ellos no se puede leer.
const DB_NAME = 'jp-solution', STORE = 'kv';
const ITERATIONS = 310000;

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function kvGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const q = db.transaction(STORE).objectStore(STORE).get(key);
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}
export async function kvSet(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    if (value === undefined) t.objectStore(STORE).delete(key); else t.objectStore(STORE).put(value, key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

const enc = new TextEncoder();
export async function deriveKey(username, password, salt) {
  const material = await crypto.subtle.importKey('raw', enc.encode(`${username.trim().toLowerCase()}\n${password}`), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encrypt(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { iv, data: new Uint8Array(data) };
}
export async function decrypt(key, { iv, data }) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
}

// Pide al navegador que no borre estos datos para liberar espacio.
export async function askPersistence() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* opcional */ }
}
