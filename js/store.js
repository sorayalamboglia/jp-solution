// Estado compartido de la sesión: persona, hogar elegido y datos de referencia.
import { get } from './api.js';
import { setCurrency } from './ui.js';

// members = personas con cuenta + nombres sin cuenta (activos); users = solo personas con cuenta.
export const S = { me: null, hid: null, h: null, role: null, members: [], users: [], people: [], invites: [], accounts: [], categories: [] };

export const H = (p = '') => `/h/${S.hid}${p}`;
export const isAdmin = () => S.role === 'admin';
export const member = (id) => S.members.find((m) => m.id === id) || S.people.find((p) => p.id === id);
export const category = (id) => S.categories.find((c) => c.id === id);
export const account = (id) => S.accounts.find((a) => a.id === id);
export const activeAccounts = () => S.accounts.filter((a) => !a.archived);
export const catsOf = (kind) => S.categories.filter((c) => c.kind === kind && !c.archived);
export const today = () => S.h?.today || new Date().toISOString().slice(0, 10);

export async function loadMe() {
  S.me = await get('/me');
  return S.me;
}

export async function selectHousehold(hid) {
  const list = S.me?.households || [];
  const target = list.find((x) => x.id === hid) || list[0];
  if (!target) { S.hid = null; S.h = null; return null; }
  S.hid = target.id;
  try { localStorage.setItem('jp-hid', S.hid); } catch { /* sin almacenamiento */ }
  await refreshHousehold();
  return S.h;
}

export async function refreshHousehold() {
  const [info, accounts, categories] = await Promise.all([get(H()), get(H('/accounts')), get(H('/categories'))]);
  S.h = info.household; S.role = info.role; S.users = info.members; S.people = info.people || []; S.invites = info.invites;
  S.members = [...S.users, ...S.people.filter((p) => !p.archived).map((p) => ({ ...p, person: true }))];
  S.accounts = accounts; S.categories = categories;
  setCurrency(S.h.currency);
}

export async function refreshRefs() {
  const [accounts, categories] = await Promise.all([get(H('/accounts')), get(H('/categories'))]);
  S.accounts = accounts; S.categories = categories;
}

export function savedHousehold() {
  try { return localStorage.getItem('jp-hid'); } catch { return null; }
}

// Avisa a la vista actual que los datos cambiaron.
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export async function changed() {
  try { await refreshRefs(); } catch { /* la vista mostrará el error */ }
  listeners.forEach((fn) => fn());
}
