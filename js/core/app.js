// JP Solution — reglas de la API (rutas, validación, permisos y cálculos), sin depender de Node.
// La usa el servidor (server.js) y también la versión personal, que la ejecuta dentro del celular.
// Toda consulta de datos se filtra por hogar y se comprueba que la persona pertenece a ese hogar.
import { tx } from './schema.js';
import * as F from './finance.js';
import { createDefaultCategories, seedDemo } from './seed.js';

const env = (k) => (typeof process !== 'undefined' ? process.env[k] : undefined);
const SESSION_DAYS = 30;
const MEMBER_COLORS = ['#8b7cf6', '#5aa9f5', '#3cc4a0', '#f28bb6', '#f2a65a', '#7c8cf8'];

export class HttpError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}
const bad = (msg, field) => new HttpError(400, msg, field);
const notFound = (msg = 'No encontramos ese registro.') => new HttpError(404, msg);

// ---------- Validación ----------
const V = {
  str(v, label, { max = 200, required = true } = {}) {
    if (v === undefined || v === null) v = '';
    if (typeof v !== 'string') throw bad(`${label}: valor no válido.`);
    v = v.trim();
    if (required && !v) throw bad(`Falta ${label.toLowerCase()}.`);
    if (v.length > max) throw bad(`${label} es demasiado largo (máximo ${max} caracteres).`);
    return v || null;
  },
  cents(v, label, { min = 1, allowZero = false, signed = false } = {}) {
    if (!Number.isInteger(v)) throw bad(`${label}: escribe un importe válido.`);
    if (Math.abs(v) > 1e13) throw bad(`${label}: el importe es demasiado grande.`);
    if (!signed && (allowZero ? v < 0 : v < min)) throw bad(allowZero ? `${label} no puede ser negativo.` : `${label} debe ser mayor que cero.`);
    return v;
  },
  date(v, label, { required = true } = {}) {
    if (!v && !required) return null;
    if (!F.isDate(v)) throw bad(`${label}: usa una fecha válida.`);
    return v;
  },
  oneOf(v, list, label) { if (!list.includes(v)) throw bad(`${label}: opción no válida.`); return v; },
  int(v, label, min, max, { required = true } = {}) {
    if ((v === null || v === undefined || v === '') && !required) return null;
    if (!Number.isInteger(v) || v < min || v > max) throw bad(`${label} debe estar entre ${min} y ${max}.`);
    return v;
  },
  email(v) {
    v = V.str(v, 'Correo', { max: 160 }).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw bad('Escribe un correo válido.', 'email');
    return v;
  },
  password(v) {
    if (typeof v !== 'string' || v.length < 8) throw bad('La contraseña debe tener al menos 8 caracteres.', 'password');
    if (v.length > 200) throw bad('La contraseña es demasiado larga.', 'password');
    return v;
  },
  currency(v) {
    v = String(v || '').toUpperCase();
    try { new Intl.NumberFormat('es', { style: 'currency', currency: v }); } catch { throw bad('Moneda no válida.'); }
    if (!/^[A-Z]{3}$/.test(v)) throw bad('Moneda no válida.');
    return v;
  },
  timezone(v) {
    try { new Intl.DateTimeFormat('es', { timeZone: v }); } catch { throw bad('Zona horaria no válida.'); }
    if (typeof v !== 'string' || !v) throw bad('Zona horaria no válida.');
    return v;
  },
  color(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null; },
  icon(v) { return typeof v === 'string' && /^[a-z-]{1,20}$/.test(v) ? v : 'tag'; },
  tags(v) {
    if (!v) return [];
    if (!Array.isArray(v)) throw bad('Etiquetas no válidas.');
    return [...new Set(v.map((t) => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, 10);
  },
};

// ---------- Sesiones ----------
function inviteCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(10)), (b) => abc[b % abc.length]).join('');
}

// Límite de intentos (en memoria) para inicio de sesión y recuperación.
const attempts = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
  list.push(now);
  attempts.set(key, list);
}

// platform: funciones que cambian según dónde corre la app (cifrado de contraseñas, envío de correo).
export function createApp(db, platform) {
  const { hashPassword, verifyPassword, sha256, randomToken, sendMail } = platform;
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, handler, opts });
  };
  const q = (sql) => db.prepare(sql);

  // ---------- Utilidades por hogar ----------
  const own = (table, id, hh, label = 'registro') => {
    if (typeof id !== 'string') throw bad(`Elige un ${label} válido.`);
    const row = q(`SELECT * FROM ${table} WHERE id=? AND household_id=?`).get(id, hh);
    if (!row) throw bad(`El ${label} elegido no existe en este hogar.`);
    return row;
  };
  const isUserMember = (hh, userId) => !!q(`SELECT 1 FROM members WHERE household_id=? AND user_id=?`).get(hh, userId);
  // Integrante = persona con cuenta o nombre agregado sin cuenta.
  const isMember = (hh, id) => isUserMember(hh, id) || !!q(`SELECT 1 FROM people WHERE household_id=? AND id=?`).get(hh, id);
  const today = (h) => F.todayIn(h.timezone);
  const refresh = (h) => {
    const t = today(h);
    tx(db, () => {
      F.materializeRecurring(db, h.id, t);
      F.syncBillOccurrences(db, h.id, F.addDays(t, 120));
    });
    return t;
  };

  function meResponse(user) {
    const households = q(`SELECT h.id, h.name, h.currency, h.timezone, h.start_day, h.is_demo, m.role
      FROM members m JOIN households h ON h.id=m.household_id WHERE m.user_id=? ORDER BY h.is_demo, h.created_at`).all(user.id);
    return { user: { id: user.id, name: user.name, email: user.email }, households, emailConfigured: !!(env('RESEND_API_KEY') && env('MAIL_FROM')) };
  }

  function startSession(res, req, userId) {
    const token = randomToken();
    const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
    q(`INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)`).run(sha256(token), userId, exp, F.nowIso());
    res.setHeader('Set-Cookie', cookie('jp_sid', token, SESSION_DAYS * 86400, req));
  }
  function cookie(name, value, maxAge, req) {
    const secure = env('COOKIE_SECURE') === '1' || req.headers['x-forwarded-proto'] === 'https';
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  }
  const origin = (req) => env('APP_URL') || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

  // ---------- Transacciones: validación compartida ----------
  function parseTransaction(body, hh, userId, { existing } = {}) {
    const type = V.oneOf(body.type, ['income', 'expense', 'refund', 'transfer'], 'Tipo');
    const amount = V.cents(body.amount, 'Importe');
    const date = V.date(body.date, 'Fecha');
    const account = own('accounts', body.account_id, hh, 'cuenta');
    if (account.archived && (!existing || existing.account_id !== account.id)) throw bad('La cuenta está archivada. Reactívala o elige otra.');
    const t = {
      type, amount, date, account_id: account.id,
      description: V.str(body.description, 'Descripción', { max: 140 }),
      merchant: V.str(body.merchant, 'Comercio', { max: 100, required: false }),
      notes: V.str(body.notes, 'Notas', { max: 1000, required: false }),
      tags: V.tags(body.tags),
      member_id: body.member_id || userId,
      splits: [],
    };
    if (!isMember(hh, t.member_id)) throw bad('El integrante elegido no pertenece al hogar.');
    if (type === 'transfer') {
      const to = own('accounts', body.to_account_id, hh, 'cuenta destino');
      if (to.id === account.id) throw bad('Elige dos cuentas diferentes para la transferencia.');
      t.to_account_id = to.id;
    } else {
      let splits = Array.isArray(body.splits) && body.splits.length ? body.splits : [{ category_id: body.category_id, amount }];
      if (splits.length > 12) throw bad('Puedes dividir una compra en máximo 12 categorías.');
      const wantKind = type === 'income' ? 'income' : 'expense';
      splits = splits.map((s) => {
        const c = own('categories', s.category_id, hh, 'categoría');
        if (c.kind !== wantKind) throw bad(type === 'income' ? 'Elige una categoría de ingreso.' : 'Elige una categoría de gasto.');
        return { category_id: c.id, amount: V.cents(s.amount, 'Importe de la división') };
      });
      const sum = splits.reduce((s, x) => s + x.amount, 0);
      if (sum !== amount) throw bad(`La suma de las divisiones (${(sum / 100).toFixed(2)}) debe ser igual al importe (${(amount / 100).toFixed(2)}).`);
      t.splits = splits;
    }
    if (body.receipt !== undefined && body.receipt !== null) {
      if (typeof body.receipt !== 'string' || !/^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,/.test(body.receipt)) throw bad('El comprobante debe ser una imagen o un PDF.');
      if (body.receipt.length > 2_800_000) throw bad('El comprobante es demasiado grande (máximo 2 MB).');
      t.receipt = body.receipt;
    }
    return t;
  }

  function txRows(where, params, { limit = 200, offset = 0 } = {}) {
    const rows = q(`SELECT t.*, u.name AS created_by_name, COALESCE(mu.name, pp.name) AS member_name,
        a.name AS account_name, a.type AS account_type, ta.name AS to_account_name
      FROM transactions t
      LEFT JOIN users u ON u.id = t.created_by
      LEFT JOIN users mu ON mu.id = t.member_id
      LEFT JOIN people pp ON pp.id = t.member_id
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN accounts ta ON ta.id = t.to_account_id
      WHERE ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    if (!rows.length) return rows;
    const ids = rows.map((r) => r.id);
    const splits = q(`SELECT * FROM splits WHERE transaction_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    const bills = q(`SELECT p.transaction_id, o.bill_id, o.due_date, b.name FROM bill_payments p JOIN bill_occurrences o ON o.id=p.occurrence_id JOIN bills b ON b.id=o.bill_id
      WHERE p.transaction_id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    return rows.map((r) => ({
      ...r, tags: r.tags ? JSON.parse(r.tags) : [],
      splits: splits.filter((s) => s.transaction_id === r.id).map(({ category_id, amount }) => ({ category_id, amount })),
      bill: bills.find((b) => b.transaction_id === r.id) || null,
    }));
  }

  // =====================================================================
  // AUTENTICACIÓN
  // =====================================================================
  route('POST', '/api/auth/register', ({ body, req, res }) => {
    rateLimit('reg:' + req.socket.remoteAddress, 20, 3600e3);
    const name = V.str(body.name, 'Nombre', { max: 60 });
    const email = V.email(body.email);
    const pw = V.password(body.password);
    if (q(`SELECT 1 FROM users WHERE email=?`).get(email)) throw new HttpError(409, 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.', 'email');
    const user = { id: F.uid(), name, email };
    tx(db, () => {
      q(`INSERT INTO users (id, email, name, pass_hash, created_at) VALUES (?,?,?,?,?)`).run(user.id, email, name, hashPassword(pw), F.nowIso());
      if (body.invite) acceptInvite(String(body.invite), user.id);
    });
    startSession(res, req, user.id);
    return meResponse(user);
  }, { public: true });

  route('POST', '/api/auth/login', ({ body, req, res }) => {
    const email = V.email(body.email);
    rateLimit('login:' + email, 8, 15 * 60e3);
    rateLimit('loginip:' + req.socket.remoteAddress, 40, 15 * 60e3);
    const user = q(`SELECT * FROM users WHERE email=?`).get(email);
    if (!user || !verifyPassword(String(body.password || ''), user.pass_hash)) throw new HttpError(401, 'Correo o contraseña incorrectos.');
    startSession(res, req, user.id);
    return meResponse(user);
  }, { public: true });

  route('POST', '/api/auth/logout', ({ req, res, token }) => {
    if (token) q(`DELETE FROM sessions WHERE token_hash=?`).run(sha256(token));
    res.setHeader('Set-Cookie', cookie('jp_sid', '', 0, req));
    return { ok: true };
  }, { public: true });

  route('POST', '/api/auth/forgot', async ({ body, req }) => {
    const email = V.email(body.email);
    rateLimit('forgot:' + email, 3, 3600e3);
    const user = q(`SELECT * FROM users WHERE email=?`).get(email);
    if (user) {
      const token = randomToken();
      q(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?,?,?)`).run(sha256(token), user.id, new Date(Date.now() + 3600e3).toISOString());
      const link = `${origin(req)}/#/restablecer?token=${token}`;
      await sendMail(user.email, 'JP Solution: restablece tu contraseña',
        `Hola ${user.name}:\n\nPara crear una contraseña nueva abre este enlace (vale 1 hora):\n${link}\n\nSi no lo pediste, ignora este mensaje.`);
    }
    return { ok: true, message: 'Si el correo está registrado, enviamos un enlace para restablecer la contraseña.' };
  }, { public: true });

  route('POST', '/api/auth/reset', ({ body, req, res }) => {
    const pw = V.password(body.password);
    const row = q(`SELECT * FROM password_resets WHERE token_hash=?`).get(sha256(String(body.token || '')));
    if (!row || row.used || row.expires_at < F.nowIso()) throw bad('El enlace no es válido o ya venció. Pide uno nuevo.');
    tx(db, () => {
      q(`UPDATE users SET pass_hash=? WHERE id=?`).run(hashPassword(pw), row.user_id);
      q(`UPDATE password_resets SET used=1 WHERE token_hash=?`).run(row.token_hash);
      q(`DELETE FROM sessions WHERE user_id=?`).run(row.user_id);
    });
    startSession(res, req, row.user_id);
    return meResponse(q(`SELECT * FROM users WHERE id=?`).get(row.user_id));
  }, { public: true });

  route('GET', '/api/me', ({ user }) => meResponse(user));

  route('PATCH', '/api/me', ({ body, user }) => {
    const name = body.name !== undefined ? V.str(body.name, 'Nombre', { max: 60 }) : user.name;
    if (body.new_password) {
      if (!verifyPassword(String(body.current_password || ''), user.pass_hash)) throw bad('La contraseña actual no es correcta.', 'current_password');
      q(`UPDATE users SET pass_hash=? WHERE id=?`).run(hashPassword(V.password(body.new_password)), user.id);
    }
    q(`UPDATE users SET name=? WHERE id=?`).run(name, user.id);
    return meResponse({ ...user, name });
  });

  route('GET', '/api/me/export', ({ user }) => {
    const hhs = q(`SELECT household_id FROM members WHERE user_id=?`).all(user.id);
    return {
      app: 'JP Solution', kind: 'export-personal', exported_at: F.nowIso(),
      profile: { name: user.name, email: user.email, created_at: user.created_at },
      households: hhs.map((m) => backupOf(m.household_id)),
    };
  });

  route('DELETE', '/api/me', ({ body, user, req, res }) => {
    if (!verifyPassword(String(body.password || ''), user.pass_hash)) throw bad('La contraseña no es correcta.', 'password');
    const memberships = q(`SELECT * FROM members WHERE user_id=?`).all(user.id);
    for (const m of memberships) {
      const others = q(`SELECT * FROM members WHERE household_id=? AND user_id<>?`).all(m.household_id, user.id);
      if (others.length && m.role === 'admin' && !others.some((o) => o.role === 'admin')) {
        const h = q(`SELECT name FROM households WHERE id=?`).get(m.household_id);
        throw new HttpError(409, `Antes de eliminar tu cuenta, nombra otro administrador en «${h.name}».`);
      }
    }
    tx(db, () => {
      for (const m of memberships) {
        const others = q(`SELECT 1 FROM members WHERE household_id=? AND user_id<>?`).get(m.household_id, user.id);
        if (!others) q(`DELETE FROM households WHERE id=?`).run(m.household_id);
      }
      q(`DELETE FROM users WHERE id=?`).run(user.id);
    });
    res.setHeader('Set-Cookie', cookie('jp_sid', '', 0, req));
    return { ok: true };
  });

  // =====================================================================
  // HOGARES, INTEGRANTES E INVITACIONES
  // =====================================================================
  function createHousehold(user, body, { demo = false } = {}) {
    const h = {
      id: F.uid(),
      name: V.str(body.name, 'Nombre del hogar', { max: 60 }),
      currency: V.currency(body.currency || 'USD'),
      timezone: V.timezone(body.timezone || 'America/New_York'),
      start_day: V.int(body.start_day ?? 1, 'Día de inicio', 1, 28),
    };
    const accounts = Array.isArray(body.accounts) ? body.accounts.slice(0, 20) : [];
    tx(db, () => {
      q(`INSERT INTO households (id, name, currency, timezone, start_day, is_demo, created_at) VALUES (?,?,?,?,?,?,?)`)
        .run(h.id, h.name, h.currency, h.timezone, h.start_day, demo ? 1 : 0, F.nowIso());
      q(`INSERT INTO members (household_id, user_id, role, color, joined_at) VALUES (?,?,?,?,?)`).run(h.id, user.id, 'admin', MEMBER_COLORS[0], F.nowIso());
      createDefaultCategories(db, h.id);
      const t = F.todayIn(h.timezone);
      for (const a of accounts) insertAccount(h.id, a, t);
      if (demo) seedDemo(db, h.id, user.id, t);
    });
    return h;
  }

  function insertAccount(hh, body, t) {
    const type = V.oneOf(body.type, ['cash', 'bank', 'savings', 'credit'], 'Tipo de cuenta');
    const a = {
      id: F.uid(), name: V.str(body.name, 'Nombre de la cuenta', { max: 60 }), type,
      opening_balance: V.cents(body.opening_balance ?? 0, 'Saldo inicial', { signed: true }),
      opening_date: V.date(body.opening_date || t, 'Fecha del saldo inicial'),
      credit_limit: type === 'credit' && body.credit_limit != null ? V.cents(body.credit_limit, 'Límite', { allowZero: true }) : null,
      cut_day: type === 'credit' ? V.int(body.cut_day ?? null, 'Día de corte', 1, 31, { required: false }) : null,
      pay_day: type === 'credit' ? V.int(body.pay_day ?? null, 'Día de pago', 1, 31, { required: false }) : null,
      color: V.color(body.color),
    };
    q(`INSERT INTO accounts (id, household_id, name, type, opening_balance, opening_date, credit_limit, cut_day, pay_day, color, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(a.id, hh, a.name, a.type, a.opening_balance, a.opening_date, a.credit_limit, a.cut_day, a.pay_day, a.color, F.nowIso());
    return a.id;
  }

  function acceptInvite(code, userId) {
    const inv = q(`SELECT * FROM invites WHERE code=?`).get(code.trim().toUpperCase());
    if (!inv || inv.used_by) throw bad('La invitación no es válida o ya se usó.');
    if (inv.expires_at < F.nowIso()) throw bad('La invitación venció. Pide una nueva.');
    if (isUserMember(inv.household_id, userId)) throw bad('Ya perteneces a este hogar.');
    const n = q(`SELECT COUNT(*) AS n FROM members WHERE household_id=?`).get(inv.household_id).n;
    q(`INSERT INTO members (household_id, user_id, role, color, joined_at) VALUES (?,?,?,?,?)`)
      .run(inv.household_id, userId, inv.role, MEMBER_COLORS[n % MEMBER_COLORS.length], F.nowIso());
    q(`UPDATE invites SET used_by=?, used_at=? WHERE code=?`).run(userId, F.nowIso(), inv.code);
    return inv.household_id;
  }

  route('POST', '/api/households', ({ body, user }) => ({ id: createHousehold(user, body).id, me: meResponse(user) }));
  route('POST', '/api/households/demo', ({ user }) => {
    const existing = q(`SELECT h.id FROM households h JOIN members m ON m.household_id=h.id WHERE m.user_id=? AND h.is_demo=1`).get(user.id);
    if (existing) return { id: existing.id, me: meResponse(user) };
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    return { id: createHousehold(user, { name: 'Hogar de demostración', currency: 'USD', timezone: tz, start_day: 1 }, { demo: true }).id, me: meResponse(user) };
  });

  route('GET', '/api/invites/:code', ({ params }) => {
    const inv = q(`SELECT i.*, h.name AS household_name FROM invites i JOIN households h ON h.id=i.household_id WHERE code=?`).get(params.code.toUpperCase());
    if (!inv || inv.used_by || inv.expires_at < F.nowIso()) throw notFound('La invitación no es válida, ya se usó o venció.');
    return { household_name: inv.household_name, role: inv.role };
  }, { public: true });
  route('POST', '/api/invites/accept', ({ body, user }) => {
    const hh = tx(db, () => acceptInvite(String(body.code || ''), user.id));
    return { id: hh, me: meResponse(user) };
  });

  route('GET', '/api/h/:hid', ({ h, role, user }) => {
    const members = q(`SELECT u.id, u.name, u.email, m.role, m.color, m.joined_at FROM members m JOIN users u ON u.id=m.user_id
      WHERE m.household_id=? ORDER BY m.joined_at`).all(h.id);
    const invites = role === 'admin' ? q(`SELECT code, role, label, expires_at, used_at FROM invites WHERE household_id=? AND used_by IS NULL AND expires_at > ? ORDER BY expires_at`).all(h.id, F.nowIso()) : [];
    const people = q(`SELECT id, name, color, archived FROM people WHERE household_id=? ORDER BY created_at`).all(h.id);
    return { household: { ...h, today: today(h) }, role, members, people, invites, me: user.id };
  }, { hh: true });

  // Nombres sin cuenta (cualquier integrante puede agregarlos sobre la marcha).
  route('POST', '/api/h/:hid/people', ({ h, body }) => {
    const name = V.str(body.name, 'Nombre', { max: 60 });
    const dup = q(`SELECT id FROM people WHERE household_id=? AND name=? COLLATE NOCASE AND archived=0`).get(h.id, name);
    if (dup) return { id: dup.id, existing: true };
    const n = q(`SELECT COUNT(*) AS n FROM people WHERE household_id=?`).get(h.id).n;
    const id = F.uid();
    q(`INSERT INTO people (id, household_id, name, color, created_at) VALUES (?,?,?,?,?)`).run(id, h.id, name, V.color(body.color) || MEMBER_COLORS[(n + 2) % MEMBER_COLORS.length], F.nowIso());
    return { id };
  }, { hh: true });
  route('PATCH', '/api/h/:hid/people/:id', ({ h, params, body }) => {
    const p = own('people', params.id, h.id, 'nombre');
    q(`UPDATE people SET name=?, color=?, archived=? WHERE id=?`).run(
      body.name !== undefined ? V.str(body.name, 'Nombre', { max: 60 }) : p.name, V.color(body.color) || p.color,
      body.archived !== undefined ? (body.archived ? 1 : 0) : p.archived, p.id);
    return { ok: true };
  }, { hh: true });
  // Al quitar un nombre se archiva: sus movimientos siguen mostrando a quién pertenecían.
  route('DELETE', '/api/h/:hid/people/:id', ({ h, params }) => {
    const p = own('people', params.id, h.id, 'nombre');
    const used = q(`SELECT COUNT(*) AS n FROM transactions WHERE member_id=?`).get(p.id).n;
    if (used) q(`UPDATE people SET archived=1 WHERE id=?`).run(p.id); else q(`DELETE FROM people WHERE id=?`).run(p.id);
    return { ok: true, archived: !!used };
  }, { hh: true });

  route('PATCH', '/api/h/:hid', ({ h, body }) => {
    const n = {
      name: body.name !== undefined ? V.str(body.name, 'Nombre del hogar', { max: 60 }) : h.name,
      currency: body.currency !== undefined ? V.currency(body.currency) : h.currency,
      timezone: body.timezone !== undefined ? V.timezone(body.timezone) : h.timezone,
      start_day: body.start_day !== undefined ? V.int(body.start_day, 'Día de inicio', 1, 28) : h.start_day,
    };
    q(`UPDATE households SET name=?, currency=?, timezone=?, start_day=? WHERE id=?`).run(n.name, n.currency, n.timezone, n.start_day, h.id);
    return { ok: true };
  }, { hh: true, admin: true });

  route('DELETE', '/api/h/:hid', ({ h, body }) => {
    if (!h.is_demo && body.confirm !== h.name) throw bad(`Para confirmar, escribe el nombre exacto del hogar: ${h.name}`);
    q(`DELETE FROM households WHERE id=?`).run(h.id);
    return { ok: true };
  }, { hh: true, admin: true });

  route('POST', '/api/h/:hid/invites', ({ h, body, user, req }) => {
    const role = V.oneOf(body.role || 'member', ['admin', 'member'], 'Permiso');
    const code = inviteCode();
    const label = V.str(body.label, 'Nombre de la persona', { max: 60, required: false });
    q(`INSERT INTO invites (code, household_id, role, label, created_by, expires_at) VALUES (?,?,?,?,?,?)`)
      .run(code, h.id, role, label, user.id, new Date(Date.now() + 7 * 864e5).toISOString());
    return { code, role, link: `${origin(req)}/#/unirse?codigo=${code}` };
  }, { hh: true, admin: true });
  route('DELETE', '/api/h/:hid/invites/:code', ({ h, params }) => {
    q(`DELETE FROM invites WHERE code=? AND household_id=?`).run(params.code, h.id);
    return { ok: true };
  }, { hh: true, admin: true });

  const adminCount = (hh) => q(`SELECT COUNT(*) AS n FROM members WHERE household_id=? AND role='admin'`).get(hh).n;
  route('PATCH', '/api/h/:hid/members/:uid', ({ h, params, body }) => {
    const m = q(`SELECT * FROM members WHERE household_id=? AND user_id=?`).get(h.id, params.uid);
    if (!m) throw notFound('Esa persona no pertenece al hogar.');
    const role = body.role !== undefined ? V.oneOf(body.role, ['admin', 'member'], 'Permiso') : m.role;
    if (m.role === 'admin' && role === 'member' && adminCount(h.id) === 1) throw bad('El hogar necesita al menos un administrador.');
    q(`UPDATE members SET role=?, color=? WHERE household_id=? AND user_id=?`).run(role, V.color(body.color) || m.color, h.id, m.user_id);
    return { ok: true };
  }, { hh: true, admin: true });
  route('DELETE', '/api/h/:hid/members/:uid', ({ h, params, role, user }) => {
    if (role !== 'admin' && params.uid !== user.id) throw new HttpError(403, 'Solo un administrador puede quitar a otras personas.');
    const m = q(`SELECT * FROM members WHERE household_id=? AND user_id=?`).get(h.id, params.uid);
    if (!m) throw notFound('Esa persona no pertenece al hogar.');
    const total = q(`SELECT COUNT(*) AS n FROM members WHERE household_id=?`).get(h.id).n;
    if (total === 1) throw bad('Eres la única persona del hogar. Si ya no lo necesitas, elimina el hogar.');
    if (m.role === 'admin' && adminCount(h.id) === 1) throw bad('Nombra otro administrador antes de salir.');
    q(`DELETE FROM members WHERE household_id=? AND user_id=?`).run(h.id, m.user_id);
    return { ok: true };
  }, { hh: true });

  // =====================================================================
  // CUENTAS Y CATEGORÍAS
  // =====================================================================
  function accountsView(h, t) {
    return F.accountBalances(db, h.id, t).map((a) => {
      const out = { ...a };
      if (a.type === 'credit') {
        out.owed = Math.max(0, -a.balance);
        out.available = a.credit_limit != null ? a.credit_limit - out.owed : null;
        const nextDay = (day) => {
          if (!day) return null;
          let d = F.addMonthsClamped(t.slice(0, 8) + '01', 0, day);
          if (d < t) d = F.addMonthsClamped(t.slice(0, 8) + '01', 1, day);
          return d;
        };
        out.next_cut = nextDay(a.cut_day);
        out.next_pay = nextDay(a.pay_day);
      }
      out.tx_count = q(`SELECT COUNT(*) AS n FROM transactions WHERE (account_id=? OR to_account_id=?) AND deleted_at IS NULL`).get(a.id, a.id).n;
      return out;
    });
  }
  route('GET', '/api/h/:hid/accounts', ({ h }) => accountsView(h, refresh(h)), { hh: true });
  route('POST', '/api/h/:hid/accounts', ({ h, body }) => ({ id: insertAccount(h.id, body, today(h)) }), { hh: true, admin: true });
  route('PATCH', '/api/h/:hid/accounts/:id', ({ h, params, body }) => {
    const a = own('accounts', params.id, h.id, 'cuenta');
    const n = {
      name: body.name !== undefined ? V.str(body.name, 'Nombre de la cuenta', { max: 60 }) : a.name,
      archived: body.archived !== undefined ? (body.archived ? 1 : 0) : a.archived,
      opening_balance: body.opening_balance !== undefined ? V.cents(body.opening_balance, 'Saldo inicial', { signed: true }) : a.opening_balance,
      opening_date: body.opening_date !== undefined ? V.date(body.opening_date, 'Fecha del saldo inicial') : a.opening_date,
      credit_limit: a.type === 'credit' && body.credit_limit !== undefined ? (body.credit_limit == null ? null : V.cents(body.credit_limit, 'Límite', { allowZero: true })) : a.credit_limit,
      cut_day: a.type === 'credit' && body.cut_day !== undefined ? V.int(body.cut_day, 'Día de corte', 1, 31, { required: false }) : a.cut_day,
      pay_day: a.type === 'credit' && body.pay_day !== undefined ? V.int(body.pay_day, 'Día de pago', 1, 31, { required: false }) : a.pay_day,
      color: body.color !== undefined ? V.color(body.color) : a.color,
    };
    q(`UPDATE accounts SET name=?, archived=?, opening_balance=?, opening_date=?, credit_limit=?, cut_day=?, pay_day=?, color=? WHERE id=?`)
      .run(n.name, n.archived, n.opening_balance, n.opening_date, n.credit_limit, n.cut_day, n.pay_day, n.color, a.id);
    return { ok: true };
  }, { hh: true, admin: true });
  route('DELETE', '/api/h/:hid/accounts/:id', ({ h, params }) => {
    const a = own('accounts', params.id, h.id, 'cuenta');
    const used = q(`SELECT COUNT(*) AS n FROM transactions WHERE account_id=? OR to_account_id=?`).get(a.id, a.id).n;
    if (used) throw new HttpError(409, 'Esta cuenta tiene movimientos. Archívala para conservar el historial.');
    if (q(`SELECT 1 FROM goals WHERE account_id=?`).get(a.id)) throw new HttpError(409, 'Una meta usa esta cuenta. Cambia la meta primero.');
    q(`DELETE FROM accounts WHERE id=?`).run(a.id);
    return { ok: true };
  }, { hh: true, admin: true });

  route('GET', '/api/h/:hid/categories', ({ h }) => q(`SELECT * FROM categories WHERE household_id=? ORDER BY kind DESC, archived, sort, name`).all(h.id), { hh: true });
  route('POST', '/api/h/:hid/categories', ({ h, body }) => {
    const id = F.uid();
    const kind = V.oneOf(body.kind || 'expense', ['expense', 'income'], 'Tipo de categoría');
    const name = V.str(body.name, 'Nombre de la categoría', { max: 40 });
    if (q(`SELECT 1 FROM categories WHERE household_id=? AND kind=? AND name=? COLLATE NOCASE AND archived=0`).get(h.id, kind, name)) throw bad('Ya existe una categoría con ese nombre.');
    const sort = q(`SELECT COALESCE(MAX(sort),0)+1 AS s FROM categories WHERE household_id=?`).get(h.id).s;
    q(`INSERT INTO categories (id, household_id, name, kind, icon, color, sort) VALUES (?,?,?,?,?,?,?)`).run(id, h.id, name, kind, V.icon(body.icon), V.color(body.color) || '#8b7cf6', sort);
    return { id };
  }, { hh: true });
  route('PATCH', '/api/h/:hid/categories/:id', ({ h, params, body }) => {
    const c = own('categories', params.id, h.id, 'categoría');
    q(`UPDATE categories SET name=?, icon=?, color=?, archived=? WHERE id=?`).run(
      body.name !== undefined ? V.str(body.name, 'Nombre de la categoría', { max: 40 }) : c.name,
      body.icon !== undefined ? V.icon(body.icon) : c.icon,
      body.color !== undefined ? (V.color(body.color) || c.color) : c.color,
      body.archived !== undefined ? (body.archived ? 1 : 0) : c.archived, c.id);
    return { ok: true };
  }, { hh: true });
  route('DELETE', '/api/h/:hid/categories/:id', ({ h, params }) => {
    const c = own('categories', params.id, h.id, 'categoría');
    const used = q(`SELECT COUNT(*) AS n FROM splits WHERE category_id=?`).get(c.id).n + q(`SELECT COUNT(*) AS n FROM bills WHERE category_id=?`).get(c.id).n;
    if (used) { q(`UPDATE categories SET archived=1 WHERE id=?`).run(c.id); return { ok: true, archived: true }; }
    tx(db, () => { q(`DELETE FROM budgets WHERE category_id=?`).run(c.id); q(`DELETE FROM categories WHERE id=?`).run(c.id); });
    return { ok: true };
  }, { hh: true, admin: true });

  // =====================================================================
  // MOVIMIENTOS
  // =====================================================================
  route('GET', '/api/h/:hid/transactions', ({ h, query }) => {
    refresh(h);
    const where = ['t.household_id=?', 't.deleted_at IS NULL'], params = [h.id];
    if (query.from) { where.push('t.date>=?'); params.push(V.date(query.from, 'Desde')); }
    if (query.to) { where.push('t.date<=?'); params.push(V.date(query.to, 'Hasta')); }
    if (query.type) { where.push('t.type=?'); params.push(query.type); }
    if (query.account) { where.push('(t.account_id=? OR t.to_account_id=?)'); params.push(query.account, query.account); }
    if (query.member) { where.push('t.member_id=?'); params.push(query.member); }
    if (query.category) { where.push('EXISTS (SELECT 1 FROM splits s WHERE s.transaction_id=t.id AND s.category_id=?)'); params.push(query.category); }
    if (query.q) {
      const like = '%' + String(query.q).slice(0, 80).replace(/[%_]/g, '') + '%';
      where.push('(t.description LIKE ? OR t.merchant LIKE ? OR t.notes LIKE ? OR t.tags LIKE ? OR CAST(t.amount AS TEXT) LIKE ?)');
      const digits = String(query.q).replace(/[^\d]/g, '');
      params.push(like, like, like, like, digits ? '%' + digits + '%' : '-');
    }
    const limit = Math.min(Number(query.limit) || 100, 500), offset = Math.max(Number(query.offset) || 0, 0);
    const items = txRows(where.join(' AND '), params, { limit: limit + 1, offset });
    return { items: items.slice(0, limit), more: items.length > limit };
  }, { hh: true });

  route('GET', '/api/h/:hid/transactions/:id', ({ h, params }) => {
    const [t] = txRows('t.id=? AND t.household_id=?', [params.id, h.id], { limit: 1 });
    if (!t) throw notFound();
    return t;
  }, { hh: true });
  route('GET', '/api/h/:hid/transactions/:id/receipt', ({ h, params }) => {
    own('transactions', params.id, h.id, 'movimiento');
    const r = q(`SELECT data FROM receipts WHERE transaction_id=?`).get(params.id);
    if (!r) throw notFound('Este movimiento no tiene comprobante.');
    return { data: r.data };
  }, { hh: true });

  route('POST', '/api/h/:hid/transactions', ({ h, body, user }) => {
    const clientId = typeof body.client_id === 'string' ? body.client_id.slice(0, 64) : null;
    if (clientId) {
      const dup = q(`SELECT id FROM transactions WHERE household_id=? AND client_id=?`).get(h.id, clientId);
      if (dup) return { id: dup.id, duplicate: true };
    }
    const t = parseTransaction(body, h.id, user.id);
    let repeat = null;
    if (body.repeat) {
      repeat = {
        frequency: V.oneOf(body.repeat.frequency, ['weekly', 'biweekly', 'monthly', 'yearly'], 'Frecuencia'),
        end_date: V.date(body.repeat.end_date, 'Fecha final', { required: false }),
      };
      if (repeat.end_date && repeat.end_date < t.date) throw bad('La fecha final debe ser posterior a la fecha del movimiento.');
    }
    const id = tx(db, () => {
      if (repeat) {
        const rid = F.uid();
        const { receipt, ...tpl } = t;
        q(`INSERT INTO recurring (id, household_id, template, frequency, start_date, end_date, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)`)
          .run(rid, h.id, JSON.stringify(tpl), repeat.frequency, t.date, repeat.end_date, user.id, F.nowIso());
        t.recurring_id = rid;
      }
      const newId = F.insertTransaction(db, h.id, { ...t, created_by: user.id, client_id: clientId });
      if (repeat) F.materializeRecurring(db, h.id, today(h));
      return newId;
    });
    return { id };
  }, { hh: true });

  route('PATCH', '/api/h/:hid/transactions/:id', ({ h, params, body, user }) => {
    const ex = own('transactions', params.id, h.id, 'movimiento');
    if (ex.deleted_at) throw notFound();
    const t = parseTransaction(body, h.id, user.id, { existing: ex });
    const payment = q(`SELECT * FROM bill_payments WHERE transaction_id=?`).get(ex.id);
    if (payment && t.type !== 'expense') throw bad('Este movimiento es el pago de una factura y debe seguir siendo un gasto.');
    tx(db, () => {
      q(`UPDATE transactions SET type=?, date=?, amount=?, account_id=?, to_account_id=?, description=?, merchant=?, notes=?, tags=?, member_id=?, updated_at=? WHERE id=?`)
        .run(t.type, t.date, t.amount, t.account_id, t.type === 'transfer' ? t.to_account_id : null, t.description, t.merchant, t.notes,
          t.tags.length ? JSON.stringify(t.tags) : null, t.member_id, F.nowIso(), ex.id);
      q(`DELETE FROM splits WHERE transaction_id=?`).run(ex.id);
      const ins = q(`INSERT INTO splits (transaction_id, category_id, amount) VALUES (?,?,?)`);
      for (const s of t.splits) ins.run(ex.id, s.category_id, s.amount);
      if (body.receipt === null) { q(`DELETE FROM receipts WHERE transaction_id=?`).run(ex.id); q(`UPDATE transactions SET has_receipt=0 WHERE id=?`).run(ex.id); }
      else if (t.receipt) { q(`INSERT OR REPLACE INTO receipts (transaction_id, data) VALUES (?,?)`).run(ex.id, t.receipt); q(`UPDATE transactions SET has_receipt=1 WHERE id=?`).run(ex.id); }
      if (payment) q(`UPDATE bill_payments SET amount=? WHERE id=?`).run(t.amount, payment.id);
    });
    return { ok: true };
  }, { hh: true });

  // Eliminación reversible: se marca como eliminado y se puede deshacer.
  route('DELETE', '/api/h/:hid/transactions/:id', ({ h, params }) => {
    const t = own('transactions', params.id, h.id, 'movimiento');
    q(`UPDATE transactions SET deleted_at=? WHERE id=?`).run(F.nowIso(), t.id);
    return { ok: true, undo: true };
  }, { hh: true });
  route('POST', '/api/h/:hid/transactions/:id/restore', ({ h, params }) => {
    const t = own('transactions', params.id, h.id, 'movimiento');
    q(`UPDATE transactions SET deleted_at=NULL WHERE id=?`).run(t.id);
    return { ok: true };
  }, { hh: true });

  route('GET', '/api/h/:hid/recurring', ({ h }) => q(`SELECT * FROM recurring WHERE household_id=? ORDER BY active DESC, created_at DESC`).all(h.id)
    .map((r) => ({ ...r, template: JSON.parse(r.template), next: F.occurrencesBetween(r.start_date, r.frequency, F.addDays(today(h), 1), F.addDays(today(h), 400), r.end_date)[0] || null })), { hh: true });
  route('PATCH', '/api/h/:hid/recurring/:id', ({ h, params, body }) => {
    const r = own('recurring', params.id, h.id, 'movimiento recurrente');
    const end = body.end_date !== undefined ? V.date(body.end_date, 'Fecha final', { required: false }) : r.end_date;
    q(`UPDATE recurring SET active=?, end_date=? WHERE id=?`).run(body.active !== undefined ? (body.active ? 1 : 0) : r.active, end, r.id);
    return { ok: true };
  }, { hh: true });
  route('DELETE', '/api/h/:hid/recurring/:id', ({ h, params }) => {
    const r = own('recurring', params.id, h.id, 'movimiento recurrente');
    q(`UPDATE recurring SET active=0 WHERE id=?`).run(r.id);
    return { ok: true };
  }, { hh: true });

  // =====================================================================
  // PRESUPUESTOS
  // =====================================================================
  route('GET', '/api/h/:hid/budgets', ({ h, query }) => {
    const t = refresh(h);
    const month = F.isMonth(query.month) ? query.month : F.periodOf(t, h.start_day);
    const prev = q(`SELECT COUNT(*) AS n FROM budgets WHERE household_id=? AND month=?`).get(h.id, F.prevMonth(month)).n;
    return { ...F.budgetFor(db, h.id, month, h.start_day), prevHasBudget: prev > 0, today: t };
  }, { hh: true });
  route('PUT', '/api/h/:hid/budgets', ({ h, body }) => {
    if (!F.isMonth(body.month)) throw bad('Mes no válido.');
    const cat = body.category_id ? own('categories', body.category_id, h.id, 'categoría').id : '';
    if (body.amount === null) {
      q(`DELETE FROM budgets WHERE household_id=? AND month=? AND category_id=?`).run(h.id, body.month, cat);
    } else {
      q(`INSERT INTO budgets (household_id, month, category_id, amount, rollover) VALUES (?,?,?,?,?)
        ON CONFLICT(household_id, month, category_id) DO UPDATE SET amount=excluded.amount, rollover=excluded.rollover`)
        .run(h.id, body.month, cat, V.cents(body.amount, 'Importe presupuestado', { allowZero: true }), body.rollover ? 1 : 0);
    }
    return { ok: true };
  }, { hh: true });
  route('POST', '/api/h/:hid/budgets/copy', ({ h, body }) => {
    if (!F.isMonth(body.month)) throw bad('Mes no válido.');
    const r = q(`INSERT OR IGNORE INTO budgets (household_id, month, category_id, amount, rollover)
      SELECT household_id, ?, category_id, amount, rollover FROM budgets WHERE household_id=? AND month=?`).run(body.month, h.id, F.prevMonth(body.month));
    return { copied: Number(r.changes) };
  }, { hh: true });

  // =====================================================================
  // FACTURAS Y CALENDARIO
  // =====================================================================
  function parseBill(body, hh) {
    return {
      name: V.str(body.name, 'Nombre de la factura', { max: 80 }),
      amount: V.cents(body.amount, 'Importe'),
      frequency: V.oneOf(body.frequency, ['once', 'weekly', 'biweekly', 'monthly', 'yearly'], 'Frecuencia'),
      first_due: V.date(body.first_due, 'Vencimiento'),
      end_date: V.date(body.end_date, 'Fecha final', { required: false }),
      account_id: body.account_id ? own('accounts', body.account_id, hh, 'cuenta').id : null,
      category_id: body.category_id ? own('categories', body.category_id, hh, 'categoría').id : null,
      reminder_days: V.int(body.reminder_days ?? 3, 'Recordatorio', 0, 30),
      notes: V.str(body.notes, 'Notas', { max: 500, required: false }),
    };
  }
  route('GET', '/api/h/:hid/bills', ({ h }) => {
    const t = refresh(h);
    const bills = q(`SELECT * FROM bills WHERE household_id=? ORDER BY active DESC, name`).all(h.id);
    const occ = F.billOccurrences(db, h.id, '0000-01-01', F.addDays(t, 400), t);
    return bills.map((b) => {
      const mine = occ.filter((o) => o.bill_id === b.id);
      return { ...b, next: mine.find((o) => o.remaining > 0) || null, overdue: mine.filter((o) => o.status === 'overdue').length };
    });
  }, { hh: true });
  route('GET', '/api/h/:hid/calendar', ({ h, query }) => {
    const t = refresh(h);
    const from = V.date(query.from, 'Desde'), to = V.date(query.to, 'Hasta');
    if (to > F.addDays(t, 120)) F.syncBillOccurrences(db, h.id, to);
    const pastDue = F.billOccurrences(db, h.id, '0000-01-01', F.addDays(from, -1), t).filter((o) => o.status === 'overdue');
    return { today: t, items: F.billOccurrences(db, h.id, from, to, t), overdueBefore: pastDue };
  }, { hh: true });
  route('POST', '/api/h/:hid/bills', ({ h, body }) => {
    const b = parseBill(body, h.id);
    const id = F.uid();
    q(`INSERT INTO bills (id, household_id, name, amount, frequency, first_due, end_date, account_id, category_id, reminder_days, notes, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, h.id, b.name, b.amount, b.frequency, b.first_due, b.end_date, b.account_id, b.category_id, b.reminder_days, b.notes, F.nowIso());
    refresh(h);
    return { id };
  }, { hh: true });
  route('PATCH', '/api/h/:hid/bills/:id', ({ h, params, body }) => {
    const ex = own('bills', params.id, h.id, 'factura');
    const b = parseBill({ ...ex, ...body }, h.id);
    const active = body.active !== undefined ? (body.active ? 1 : 0) : ex.active;
    tx(db, () => {
      q(`UPDATE bills SET name=?, amount=?, frequency=?, first_due=?, end_date=?, account_id=?, category_id=?, reminder_days=?, notes=?, active=? WHERE id=?`)
        .run(b.name, b.amount, b.frequency, b.first_due, b.end_date, b.account_id, b.category_id, b.reminder_days, b.notes, active, ex.id);
      // Las fechas futuras sin pagos se regeneran con los datos nuevos; las pagadas se conservan.
      q(`DELETE FROM bill_occurrences WHERE bill_id=? AND due_date >= ? AND id NOT IN (SELECT occurrence_id FROM bill_payments)`).run(ex.id, today(h));
    });
    refresh(h);
    return { ok: true };
  }, { hh: true });
  route('DELETE', '/api/h/:hid/bills/:id', ({ h, params }) => {
    const b = own('bills', params.id, h.id, 'factura');
    const paid = q(`SELECT COUNT(*) AS n FROM bill_payments p JOIN bill_occurrences o ON o.id=p.occurrence_id WHERE o.bill_id=?`).get(b.id).n;
    if (paid) {
      tx(db, () => {
        q(`UPDATE bills SET active=0 WHERE id=?`).run(b.id);
        q(`DELETE FROM bill_occurrences WHERE bill_id=? AND id NOT IN (SELECT occurrence_id FROM bill_payments)`).run(b.id);
      });
      return { ok: true, archived: true };
    }
    q(`DELETE FROM bills WHERE id=?`).run(b.id);
    return { ok: true };
  }, { hh: true });

  const occurrenceWithStatus = (h, oid) => {
    const t = today(h);
    const o = q(`SELECT o.*, b.name, b.account_id, b.category_id, b.debt_id,
        COALESCE((SELECT SUM(p.amount) FROM bill_payments p JOIN transactions t ON t.id=p.transaction_id WHERE p.occurrence_id=o.id AND t.deleted_at IS NULL),0) AS paid
      FROM bill_occurrences o JOIN bills b ON b.id=o.bill_id WHERE o.id=? AND o.household_id=?`).get(oid, h.id);
    if (!o) throw notFound('No encontramos ese vencimiento.');
    return F.withStatus(o, t);
  };
  route('GET', '/api/h/:hid/occurrences/:oid/candidates', ({ h, params }) => {
    const o = occurrenceWithStatus(h, params.oid);
    return txRows(`t.household_id=? AND t.deleted_at IS NULL AND t.type='expense' AND t.date BETWEEN ? AND ?
      AND t.id NOT IN (SELECT transaction_id FROM bill_payments)`, [h.id, F.addDays(o.due_date, -20), F.addDays(o.due_date, 20)], { limit: 40 })
      .sort((a, b) => Math.abs(a.amount - o.remaining) - Math.abs(b.amount - o.remaining)).slice(0, 8);
  }, { hh: true });
  route('POST', '/api/h/:hid/occurrences/:oid/pay', ({ h, params, body, user }) => {
    const clientId = typeof body.client_id === 'string' ? body.client_id.slice(0, 64) : null;
    if (clientId) {
      const dup = q(`SELECT id FROM transactions WHERE household_id=? AND client_id=?`).get(h.id, clientId);
      if (dup) return { transaction_id: dup.id, duplicate: true };
    }
    return tx(db, () => {
      const o = occurrenceWithStatus(h, params.oid);
      if (o.remaining === 0) throw new HttpError(409, 'Esta factura ya está pagada.');
      if (body.transaction_id) {
        // Enlazar un gasto que ya existe (evita registrar el pago dos veces).
        const t = own('transactions', body.transaction_id, h.id, 'movimiento');
        if (t.deleted_at || t.type !== 'expense') throw bad('Solo puedes enlazar un gasto vigente.');
        if (q(`SELECT 1 FROM bill_payments WHERE transaction_id=?`).get(t.id)) throw new HttpError(409, 'Ese gasto ya está enlazado a otra factura.');
        q(`INSERT INTO bill_payments (id, occurrence_id, transaction_id, amount) VALUES (?,?,?,?)`).run(F.uid(), o.id, t.id, Math.min(t.amount, o.remaining));
        recordDebtPaymentFromBill(h, o, t.id, Math.min(t.amount, o.remaining), t.date, user.id);
        return { transaction_id: t.id, linked: true };
      }
      const amount = V.cents(body.amount ?? o.remaining, 'Importe pagado');
      if (amount > o.remaining) throw bad(`El pago no puede ser mayor que lo pendiente (${(o.remaining / 100).toFixed(2)}).`);
      let categoryId = body.category_id || o.category_id;
      if (!categoryId && o.debt_id) categoryId = q(`SELECT id FROM categories WHERE household_id=? AND kind='expense' AND archived=0 ORDER BY name='Deudas y préstamos' DESC, sort LIMIT 1`).get(h.id)?.id;
      if (!categoryId) categoryId = q(`SELECT id FROM categories WHERE household_id=? AND kind='expense' AND archived=0 ORDER BY name='Servicios' DESC, sort LIMIT 1`).get(h.id)?.id;
      const t = parseTransaction({
        type: 'expense', amount, date: body.date || today(h), account_id: body.account_id || o.account_id,
        category_id: categoryId, description: o.name + (amount < o.remaining ? ' (pago parcial)' : ''), member_id: body.member_id, notes: body.notes,
      }, h.id, user.id);
      const txId = F.insertTransaction(db, h.id, { ...t, created_by: user.id, client_id: clientId });
      q(`INSERT INTO bill_payments (id, occurrence_id, transaction_id, amount) VALUES (?,?,?,?)`).run(F.uid(), o.id, txId, amount);
      recordDebtPaymentFromBill(h, o, txId, amount, t.date, user.id);
      return { transaction_id: txId };
    });
  }, { hh: true });

  // =====================================================================
  // METAS DE AHORRO
  // =====================================================================
  function parseGoal(body, hh) {
    const mode = V.oneOf(body.mode, ['account', 'tracking'], 'Tipo de meta');
    const g = {
      name: V.str(body.name, 'Nombre de la meta', { max: 60 }),
      target: V.cents(body.target, 'Importe objetivo'),
      target_date: V.date(body.target_date, 'Fecha objetivo', { required: false }),
      mode, account_id: null,
      members: Array.isArray(body.members) ? body.members.filter((m) => isMember(hh, m)) : [],
      icon: V.icon(body.icon), color: V.color(body.color) || '#8b7cf6',
    };
    if (mode === 'account') {
      const a = own('accounts', body.account_id, hh, 'cuenta de la meta');
      if (a.type === 'credit') throw bad('Una meta no puede usar una tarjeta de crédito.');
      g.account_id = a.id;
    }
    return g;
  }
  route('GET', '/api/h/:hid/goals', ({ h }) => F.goalsWithProgress(db, h.id, refresh(h)), { hh: true });
  route('POST', '/api/h/:hid/goals', ({ h, body }) => {
    const g = parseGoal(body, h.id), id = F.uid();
    q(`INSERT INTO goals (id, household_id, name, target, target_date, mode, account_id, members, icon, color, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, h.id, g.name, g.target, g.target_date, g.mode, g.account_id, JSON.stringify(g.members), g.icon, g.color, F.nowIso());
    return { id };
  }, { hh: true });
  route('PATCH', '/api/h/:hid/goals/:id', ({ h, params, body }) => {
    const ex = own('goals', params.id, h.id, 'meta');
    const g = parseGoal({ ...ex, members: JSON.parse(ex.members), ...body }, h.id);
    q(`UPDATE goals SET name=?, target=?, target_date=?, mode=?, account_id=?, members=?, icon=?, color=?, archived=? WHERE id=?`)
      .run(g.name, g.target, g.target_date, g.mode, g.account_id, JSON.stringify(g.members), g.icon, g.color, body.archived !== undefined ? (body.archived ? 1 : 0) : ex.archived, ex.id);
    return { ok: true };
  }, { hh: true });
  route('DELETE', '/api/h/:hid/goals/:id', ({ h, params }) => {
    const g = own('goals', params.id, h.id, 'meta');
    q(`DELETE FROM goals WHERE id=?`).run(g.id);
    return { ok: true, note: 'Los movimientos entre cuentas que ya se registraron se conservan.' };
  }, { hh: true });
  route('POST', '/api/h/:hid/goals/:id/entries', ({ h, params, body, user }) => {
    const g = own('goals', params.id, h.id, 'meta');
    const clientId = typeof body.client_id === 'string' ? body.client_id.slice(0, 64) : null;
    if (clientId) {
      const dup = q(`SELECT id FROM goal_entries WHERE household_id=? AND client_id=?`).get(h.id, clientId);
      if (dup) return { id: dup.id, duplicate: true };
    }
    const amount = V.cents(body.amount, 'Importe', { signed: true });
    if (amount === 0) throw bad('El importe debe ser distinto de cero.');
    const date = V.date(body.date || today(h), 'Fecha');
    const note = V.str(body.note, 'Nota', { max: 140, required: false });
    const memberId = body.member_id && isMember(h.id, body.member_id) ? body.member_id : user.id;
    return tx(db, () => {
      let txId = null;
      if (g.mode === 'account') {
        // El dinero se mueve de verdad: se registra una transferencia entre cuentas propias.
        const other = own('accounts', body.from_account_id, h.id, 'cuenta de origen');
        if (other.id === g.account_id) throw bad('Elige una cuenta distinta a la de la meta.');
        const t = parseTransaction({
          type: 'transfer', amount: Math.abs(amount), date,
          account_id: amount > 0 ? other.id : g.account_id, to_account_id: amount > 0 ? g.account_id : other.id,
          description: `${amount > 0 ? 'Aportación' : 'Retiro'}: ${g.name}`, member_id: memberId, notes: note,
        }, h.id, user.id);
        txId = F.insertTransaction(db, h.id, { ...t, created_by: user.id });
      }
      const id = F.uid();
      q(`INSERT INTO goal_entries (id, goal_id, household_id, date, amount, note, transaction_id, member_id, created_by, client_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, g.id, h.id, date, amount, note, txId, memberId, user.id, clientId, F.nowIso());
      return { id, transaction_id: txId };
    });
  }, { hh: true });
  route('DELETE', '/api/h/:hid/goals/:id/entries/:eid', ({ h, params }) => {
    const e = q(`SELECT * FROM goal_entries WHERE id=? AND goal_id=? AND household_id=?`).get(params.eid, params.id, h.id);
    if (!e) throw notFound();
    tx(db, () => {
      if (e.transaction_id) q(`UPDATE transactions SET deleted_at=? WHERE id=?`).run(F.nowIso(), e.transaction_id);
      q(`DELETE FROM goal_entries WHERE id=?`).run(e.id);
    });
    return { ok: true };
  }, { hh: true });

  // =====================================================================
  // DEUDAS (seguimiento manual)
  // =====================================================================
  function parseDebt(body, hh) {
    const d = {
      name: V.str(body.name, 'Nombre de la deuda', { max: 60 }),
      lender: V.str(body.lender, 'Acreedor', { max: 60, required: false }),
      start_balance: V.cents(body.start_balance, 'Saldo', { allowZero: true }),
      start_date: V.date(body.start_date, 'Fecha del saldo'),
      rate_bp: V.int(body.rate_bp ?? 0, 'Tasa', 0, 20000),
      min_payment: V.cents(body.min_payment ?? 0, 'Pago mensual', { allowZero: true }),
      due_day: V.int(body.due_day ?? null, 'Día de pago', 1, 31, { required: false }),
      total_payments: V.int(body.total_payments ?? null, 'Total de pagos', 1, 1200, { required: false }),
      payments_before: V.int(body.payments_before ?? 0, 'Pagos ya hechos', 0, 1200),
      alert: body.alert ? 1 : 0,
      reminder_days: V.int(body.reminder_days ?? 3, 'Recordatorio', 0, 30),
      account_id: body.account_id ? own('accounts', body.account_id, hh, 'cuenta de pago').id : null,
    };
    if (d.total_payments && d.payments_before > d.total_payments) throw bad('Los pagos ya hechos no pueden ser más que el total de pagos.');
    if (d.alert && !d.due_day) throw bad('Para la alerta del calendario, elige el día de pago.');
    if (d.alert && !d.min_payment) throw bad('Para la alerta del calendario, escribe el pago mensual.');
    return d;
  }
  const nextDueDay = (t, day) => {
    let d = F.addMonthsClamped(t.slice(0, 8) + '01', 0, day);
    if (d < t) d = F.addMonthsClamped(t.slice(0, 8) + '01', 1, day);
    return d;
  };
  // Mantiene la factura del calendario que corresponde a la deuda (si la persona activó la alerta).
  function syncDebtBill(h, debtId) {
    const d = F.debtsWithBalance(db, h.id).find((x) => x.id === debtId);
    const bill = q(`SELECT * FROM bills WHERE debt_id=? AND household_id=?`).get(debtId, h.id);
    const t = today(h);
    const want = d && d.alert && !d.archived && d.due_day && d.min_payment > 0 && d.balance > 0 && d.paymentsLeft !== 0;
    if (!want) {
      if (bill) removeBill(bill);
      return;
    }
    const firstDue = nextDueDay(t, d.due_day);
    const endDate = d.paymentsLeft ? F.nthOccurrence(firstDue, 'monthly', d.paymentsLeft - 1) : null;
    const cat = q(`SELECT id FROM categories WHERE household_id=? AND kind='expense' AND archived=0 ORDER BY name='Deudas y préstamos' DESC, sort LIMIT 1`).get(h.id)?.id;
    const name = `Pago: ${d.name}`;
    if (bill) {
      q(`UPDATE bills SET name=?, amount=?, frequency='monthly', first_due=?, end_date=?, account_id=?, category_id=?, reminder_days=?, active=1 WHERE id=?`)
        .run(name, d.min_payment, firstDue, endDate, d.account_id, cat, d.reminder_days, bill.id);
      q(`DELETE FROM bill_occurrences WHERE bill_id=? AND due_date >= ? AND id NOT IN (SELECT occurrence_id FROM bill_payments)`).run(bill.id, t);
    } else {
      q(`INSERT INTO bills (id, household_id, name, amount, frequency, first_due, end_date, account_id, category_id, reminder_days, debt_id, created_at)
        VALUES (?,?,?,?,'monthly',?,?,?,?,?,?,?)`).run(F.uid(), h.id, name, d.min_payment, firstDue, endDate, d.account_id, cat, d.reminder_days, d.id, F.nowIso());
    }
    F.syncBillOccurrences(db, h.id, F.addDays(t, 120));
  }
  function removeBill(bill) {
    const paid = q(`SELECT COUNT(*) AS n FROM bill_payments p JOIN bill_occurrences o ON o.id=p.occurrence_id WHERE o.bill_id=?`).get(bill.id).n;
    if (paid) {
      q(`UPDATE bills SET active=0 WHERE id=?`).run(bill.id);
      q(`DELETE FROM bill_occurrences WHERE bill_id=? AND id NOT IN (SELECT occurrence_id FROM bill_payments)`).run(bill.id);
    } else q(`DELETE FROM bills WHERE id=?`).run(bill.id);
  }
  // Pagar en el calendario la factura de una deuda también registra el pago de la deuda.
  function recordDebtPaymentFromBill(h, o, txId, amount, date, userId) {
    if (!o.debt_id || !q(`SELECT 1 FROM debts WHERE id=? AND household_id=?`).get(o.debt_id, h.id)) return;
    q(`INSERT INTO debt_payments (id, debt_id, household_id, date, amount, note, transaction_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(F.uid(), o.debt_id, h.id, date, amount, 'Pagado desde el calendario', txId, userId, F.nowIso());
  }
  route('GET', '/api/h/:hid/debts', ({ h }) => {
    const t = refresh(h);
    const occ = F.billOccurrences(db, h.id, '0000-01-01', F.addDays(t, 400), t);
    return F.debtsWithBalance(db, h.id).map((d) => {
      const bill = q(`SELECT id, active FROM bills WHERE debt_id=?`).get(d.id);
      const next = bill ? occ.find((o) => o.bill_id === bill.id && o.remaining > 0) : null;
      return { ...d, bill_id: bill?.active ? bill.id : null, next_due: next?.due_date || (d.due_day && d.balance > 0 ? nextDueDay(t, d.due_day) : null) };
    });
  }, { hh: true });
  const DEBT_COLS = ['name', 'lender', 'start_balance', 'start_date', 'rate_bp', 'min_payment', 'due_day', 'total_payments', 'payments_before', 'alert', 'reminder_days', 'account_id'];
  route('POST', '/api/h/:hid/debts', ({ h, body }) => {
    const d = parseDebt(body, h.id), id = F.uid();
    tx(db, () => {
      q(`INSERT INTO debts (id, household_id, ${DEBT_COLS.join(', ')}, created_at) VALUES (?,?,${DEBT_COLS.map(() => '?').join(',')},?)`)
        .run(id, h.id, ...DEBT_COLS.map((k) => d[k]), F.nowIso());
      syncDebtBill(h, id);
    });
    return { id };
  }, { hh: true });
  route('PATCH', '/api/h/:hid/debts/:id', ({ h, params, body }) => {
    const ex = own('debts', params.id, h.id, 'deuda');
    const d = parseDebt({ ...ex, ...body }, h.id);
    tx(db, () => {
      q(`UPDATE debts SET ${DEBT_COLS.map((k) => k + '=?').join(', ')}, archived=? WHERE id=?`)
        .run(...DEBT_COLS.map((k) => d[k]), body.archived !== undefined ? (body.archived ? 1 : 0) : ex.archived, ex.id);
      syncDebtBill(h, ex.id);
    });
    return { ok: true };
  }, { hh: true });
  route('DELETE', '/api/h/:hid/debts/:id', ({ h, params }) => {
    const d = own('debts', params.id, h.id, 'deuda');
    tx(db, () => {
      const bill = q(`SELECT * FROM bills WHERE debt_id=?`).get(d.id);
      if (bill) removeBill(bill);
      q(`DELETE FROM debts WHERE id=?`).run(d.id);
    });
    return { ok: true };
  }, { hh: true });
  route('POST', '/api/h/:hid/debts/:id/payments', ({ h, params, body, user }) => {
    const d = own('debts', params.id, h.id, 'deuda');
    const clientId = typeof body.client_id === 'string' ? body.client_id.slice(0, 64) : null;
    if (clientId) {
      const dup = q(`SELECT id FROM debt_payments WHERE household_id=? AND client_id=?`).get(h.id, clientId);
      if (dup) return { id: dup.id, duplicate: true };
    }
    const amount = V.cents(body.amount, 'Importe del pago');
    const date = V.date(body.date || today(h), 'Fecha');
    const note = V.str(body.note, 'Nota', { max: 140, required: false });
    return tx(db, () => {
      let txId = null;
      if (body.account_id) {
        let categoryId = body.category_id || q(`SELECT id FROM categories WHERE household_id=? AND kind='expense' AND archived=0 ORDER BY name='Deudas y préstamos' DESC, sort LIMIT 1`).get(h.id)?.id;
        const t = parseTransaction({ type: 'expense', amount, date, account_id: body.account_id, category_id: categoryId, description: `Pago: ${d.name}`, notes: note }, h.id, user.id);
        txId = F.insertTransaction(db, h.id, { ...t, created_by: user.id });
      }
      const id = F.uid();
      q(`INSERT INTO debt_payments (id, debt_id, household_id, date, amount, note, transaction_id, client_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(id, d.id, h.id, date, amount, note, txId, clientId, user.id, F.nowIso());
      // Si la deuda tiene alerta en el calendario, el pago marca el vencimiento pendiente más cercano.
      const bill = q(`SELECT id FROM bills WHERE debt_id=? AND active=1`).get(d.id);
      if (bill && txId) {
        const o = F.billOccurrences(db, h.id, '0000-01-01', F.addDays(date, 31), today(h)).find((x) => x.bill_id === bill.id && x.remaining > 0);
        if (o) q(`INSERT INTO bill_payments (id, occurrence_id, transaction_id, amount) VALUES (?,?,?,?)`).run(F.uid(), o.id, txId, Math.min(amount, o.remaining));
      }
      return { id, transaction_id: txId };
    });
  }, { hh: true });
  route('DELETE', '/api/h/:hid/debts/:id/payments/:pid', ({ h, params }) => {
    const p = q(`SELECT * FROM debt_payments WHERE id=? AND debt_id=? AND household_id=?`).get(params.pid, params.id, h.id);
    if (!p) throw notFound();
    tx(db, () => {
      if (p.transaction_id) q(`UPDATE transactions SET deleted_at=? WHERE id=?`).run(F.nowIso(), p.transaction_id);
      q(`DELETE FROM debt_payments WHERE id=?`).run(p.id);
    });
    return { ok: true };
  }, { hh: true });

  // =====================================================================
  // RESUMEN (INICIO)
  // =====================================================================
  route('GET', '/api/h/:hid/summary', ({ h, query }) => {
    const t = refresh(h);
    const current = F.periodOf(t, h.start_day);
    const month = F.isMonth(query.month) ? query.month : current;
    const { from, to } = F.periodRange(month, h.start_day);
    const prev = F.periodRange(F.prevMonth(month), h.start_day);
    const accounts = accountsView(h, t).filter((a) => !a.archived);
    const assets = accounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
    const creditOwed = accounts.filter((a) => a.type === 'credit').reduce((s, a) => s + Math.max(0, -a.balance), 0);
    const savings = accounts.filter((a) => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
    // Comprometido: facturas vencidas sin pagar + pendientes hasta el fin del período actual.
    const horizon = month === current ? to : F.periodRange(current, h.start_day).to;
    const occ = F.billOccurrences(db, h.id, '0000-01-01', F.addDays(t, 45), t);
    const committedItems = occ.filter((o) => o.remaining > 0 && o.due_date <= horizon);
    const committed = committedItems.reduce((s, o) => s + o.remaining, 0);
    const upcoming = occ.filter((o) => o.remaining > 0).slice(0, 6);
    const goals = F.goalsWithProgress(db, h.id, t).filter((g) => !g.archived);
    const cats = q(`SELECT id, name, icon, color FROM categories WHERE household_id=?`).all(h.id);
    const spending = F.categorySpending(db, h.id, from, to).filter((r) => r.spent > 0)
      .map((r) => ({ ...cats.find((c) => c.id === r.id), spent: r.spent })).sort((a, b) => b.spent - a.spent);
    return {
      today: t, month, current, from, to,
      accounts, assets, creditOwed, savings, net: assets - creditOwed,
      committed, committedCount: committedItems.length, freeAfterCommitted: assets - committed,
      period: F.incomeExpense(db, h.id, from, to),
      previous: { ...F.incomeExpense(db, h.id, prev.from, prev.to), from: prev.from, to: prev.to },
      budget: F.budgetFor(db, h.id, month, h.start_day),
      upcoming, goals,
      goalsAccountSaved: goals.filter((g) => g.mode === 'account').reduce((s, g) => s + g.saved, 0),
      goalsTracked: goals.filter((g) => g.mode === 'tracking').reduce((s, g) => s + g.saved, 0),
      recent: txRows('t.household_id=? AND t.deleted_at IS NULL AND t.date<=?', [h.id, t], { limit: 6 }),
      spending,
    };
  }, { hh: true });

  // =====================================================================
  // INFORMES
  // =====================================================================
  route('GET', '/api/h/:hid/reports', ({ h, query }) => {
    const t = refresh(h);
    const from = V.date(query.from, 'Desde'), to = V.date(query.to, 'Hasta');
    if (from > to) throw bad('La fecha inicial debe ser anterior a la final.');
    const days = (Date.parse(to) - Date.parse(from)) / 864e5;
    if (days > 366 * 5) throw bad('Elige un rango de hasta 5 años.');
    const buckets = [];
    if (days <= 45) {
      for (let s = from; s <= to; s = F.addDays(s, 7)) { const e = F.addDays(s, 6) > to ? to : F.addDays(s, 6); buckets.push({ from: s, to: e, label: s }); }
    } else {
      for (let s = from; s <= to;) {
        const monthEnd = F.addDays(F.addMonthsClamped(s.slice(0, 8) + '01', 1), -1);
        const e = monthEnd > to ? to : monthEnd;
        buckets.push({ from: s, to: e, label: s.slice(0, 7) });
        s = F.addDays(e, 1);
      }
    }
    const netWorth = (asOf) => F.accountBalances(db, h.id, asOf).reduce((s, a) => s + a.balance, 0);
    const series = buckets.map((b) => ({ ...b, ...F.incomeExpense(db, h.id, b.from, b.to), balance: netWorth(b.to > t ? t : b.to) }));
    const cats = q(`SELECT id, name, icon, color, kind FROM categories WHERE household_id=?`).all(h.id);
    const categories = F.categorySpending(db, h.id, from, to).filter((r) => r.spent > 0)
      .map((r) => ({ ...cats.find((c) => c.id === r.id), spent: r.spent })).sort((a, b) => b.spent - a.spent);
    const byMember = q(`SELECT t.member_id AS id, COALESCE(u.name, pp.name) AS name, SUM(CASE WHEN t.type='expense' THEN t.amount WHEN t.type='refund' THEN -t.amount ELSE 0 END) AS spent,
        SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) AS income
      FROM transactions t LEFT JOIN users u ON u.id=t.member_id LEFT JOIN people pp ON pp.id=t.member_id WHERE t.household_id=? AND t.deleted_at IS NULL AND t.date BETWEEN ? AND ? GROUP BY t.member_id`).all(h.id, from, to);
    // Presupuesto: cada mes de presupuesto cuyo inicio cae dentro del rango.
    const budgets = [];
    for (let m = F.periodOf(from, h.start_day); m <= F.periodOf(to, h.start_day) && budgets.length < 60; m = F.nextMonth(m)) {
      const b = F.budgetFor(db, h.id, m, h.start_day);
      if (b.totalBudget > 0) budgets.push({ month: m, budget: b.totalBudget, spent: b.totalSpent, lines: b.lines });
    }
    return {
      from, to, today: t, series, categories, byMember, budgets,
      totals: F.incomeExpense(db, h.id, from, to),
      startBalance: netWorth(F.addDays(from, -1)), endBalance: netWorth(to > t ? t : to),
      goals: F.goalsWithProgress(db, h.id, t).filter((g) => !g.archived).map(({ entries, ...g }) => g),
    };
  }, { hh: true });

  // =====================================================================
  // IMPORTACIÓN CSV
  // =====================================================================
  function normalizeImportRows(body, h) {
    const account = own('accounts', body.account_id, h.id, 'cuenta');
    if (!Array.isArray(body.rows) || !body.rows.length) throw bad('No hay filas para importar.');
    if (body.rows.length > 5000) throw bad('Importa como máximo 5000 filas por archivo.');
    const cats = q(`SELECT * FROM categories WHERE household_id=? AND archived=0`).all(h.id);
    const fallback = { expense: cats.find((c) => c.name === 'Otros gastos' && c.kind === 'expense') || cats.find((c) => c.kind === 'expense'),
      income: cats.find((c) => c.name === 'Otros ingresos' && c.kind === 'income') || cats.find((c) => c.kind === 'income') };
    return { account, rows: body.rows.map((r, i) => {
      const errors = [];
      if (!F.isDate(r.date)) errors.push('Fecha no válida');
      if (!Number.isInteger(r.amount) || r.amount === 0) errors.push('Importe no válido');
      const description = String(r.description || '').trim().slice(0, 140) || 'Movimiento importado';
      const type = r.amount > 0 ? (r.type === 'refund' ? 'refund' : 'income') : 'expense';
      let cat = r.category_id ? cats.find((c) => c.id === r.category_id) : null;
      if (!cat && r.category_name) cat = cats.find((c) => c.name.toLowerCase() === String(r.category_name).trim().toLowerCase() && c.kind === (type === 'income' ? 'income' : 'expense'));
      if (!cat || cat.kind !== (type === 'income' ? 'income' : 'expense')) cat = fallback[type === 'income' ? 'income' : 'expense'];
      return { index: i, date: r.date, amount: Math.abs(r.amount || 0), type, description, merchant: r.merchant ? String(r.merchant).slice(0, 100) : null,
        notes: r.notes ? String(r.notes).slice(0, 1000) : null, category_id: cat?.id, category_name: cat?.name, errors };
    }) };
  }
  route('POST', '/api/h/:hid/import/check', ({ h, body }) => {
    const { account, rows } = normalizeImportRows(body, h);
    const seen = new Map();
    const findDup = q(`SELECT id, date, description FROM transactions WHERE household_id=? AND deleted_at IS NULL AND account_id=? AND amount=? AND type=? AND date BETWEEN ? AND ? LIMIT 1`);
    return rows.map((r) => {
      if (r.errors.length) return r;
      const key = `${r.date}|${r.amount}|${r.type}|${r.description.toLowerCase()}`;
      const inFile = seen.has(key); seen.set(key, true);
      const existing = findDup.get(h.id, account.id, r.amount, r.type, F.addDays(r.date, -2), F.addDays(r.date, 2));
      return { ...r, duplicate: existing ? { id: existing.id, date: existing.date, description: existing.description } : null, duplicateInFile: inFile };
    });
  }, { hh: true });
  route('POST', '/api/h/:hid/import/commit', ({ h, body, user }) => {
    const { account, rows } = normalizeImportRows(body, h);
    const skip = new Set(Array.isArray(body.skip) ? body.skip : []);
    const batch = F.uid();
    let count = 0;
    tx(db, () => {
      for (const r of rows) {
        if (r.errors.length || skip.has(r.index)) continue;
        F.insertTransaction(db, h.id, { ...r, account_id: account.id, splits: [{ category_id: r.category_id, amount: r.amount }],
          member_id: user.id, created_by: user.id, import_batch: batch });
        count++;
      }
    });
    return { batch, count };
  }, { hh: true });
  route('DELETE', '/api/h/:hid/import/:batch', ({ h, params }) => {
    const r = q(`UPDATE transactions SET deleted_at=? WHERE household_id=? AND import_batch=? AND deleted_at IS NULL`).run(F.nowIso(), h.id, params.batch);
    return { removed: Number(r.changes) };
  }, { hh: true });

  // =====================================================================
  // RESPALDO Y RESTAURACIÓN
  // =====================================================================
  const BACKUP_TABLES = ['people', 'accounts', 'categories', 'transactions', 'splits', 'receipts', 'recurring', 'budgets', 'bills', 'bill_occurrences', 'bill_payments', 'goals', 'goal_entries', 'debts', 'debt_payments'];
  function backupOf(hh) {
    const h = q(`SELECT * FROM households WHERE id=?`).get(hh);
    const members = q(`SELECT u.id, u.name, u.email, m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.household_id=?`).all(hh);
    const data = {};
    for (const t of BACKUP_TABLES) {
      if (t === 'splits') data[t] = q(`SELECT s.* FROM splits s JOIN transactions x ON x.id=s.transaction_id WHERE x.household_id=?`).all(hh);
      else if (t === 'receipts') data[t] = q(`SELECT r.* FROM receipts r JOIN transactions x ON x.id=r.transaction_id WHERE x.household_id=?`).all(hh);
      else if (t === 'bill_payments') data[t] = q(`SELECT p.* FROM bill_payments p JOIN bill_occurrences o ON o.id=p.occurrence_id WHERE o.household_id=?`).all(hh);
      else data[t] = q(`SELECT * FROM ${t} WHERE household_id=?`).all(hh);
    }
    return { app: 'JP Solution', kind: 'backup', version: 1, exported_at: F.nowIso(), household: h, members, data };
  }
  route('GET', '/api/h/:hid/backup', ({ h }) => backupOf(h.id), { hh: true, admin: true });

  route('POST', '/api/h/:hid/restore', ({ h, body, user }) => {
    const b = body.backup;
    const mode = V.oneOf(body.mode, ['merge', 'replace'], 'Modo de restauración');
    if (!b || b.app !== 'JP Solution' || b.kind !== 'backup' || !b.data) throw bad('El archivo no es un respaldo de JP Solution.');
    const sameHousehold = b.household?.id === h.id;
    // Si el respaldo viene de otro hogar se crean identificadores nuevos (derivados del hogar destino y del original)
    // para no mezclar datos entre hogares; así, restaurar dos veces el mismo respaldo no duplica nada.
    const mapId = (id) => {
      if (id == null || id === '' || sameHousehold) return id;
      const hx = F.hashHex(h.id + ':' + id);
      return `${hx.slice(0, 8)}-${hx.slice(8, 12)}-4${hx.slice(13, 16)}-a${hx.slice(17, 20)}-${hx.slice(20, 32)}`;
    };
    const memberIds = new Set(q(`SELECT user_id FROM members WHERE household_id=?`).all(h.id).map((m) => m.user_id));
    const backupPeople = new Set((b.data.people || []).map((p) => p.id));
    const mapUser = (id) => (id && memberIds.has(id) ? id : id && backupPeople.has(id) ? mapId(id) : user.id);
    const cols = {
      accounts: ['id', 'name', 'type', 'opening_balance', 'opening_date', 'credit_limit', 'cut_day', 'pay_day', 'archived', 'color', 'created_at'],
      categories: ['id', 'name', 'kind', 'icon', 'color', 'archived', 'sort'],
      transactions: ['id', 'type', 'date', 'amount', 'account_id', 'to_account_id', 'description', 'merchant', 'notes', 'tags', 'member_id', 'created_by', 'recurring_id', 'import_batch', 'has_receipt', 'created_at', 'updated_at', 'deleted_at'],
      splits: ['transaction_id', 'category_id', 'amount'],
      receipts: ['transaction_id', 'data'],
      recurring: ['id', 'template', 'frequency', 'start_date', 'end_date', 'active', 'created_by', 'created_at'],
      budgets: ['month', 'category_id', 'amount', 'rollover'],
      people: ['id', 'name', 'color', 'archived', 'created_at'],
      bills: ['id', 'name', 'amount', 'frequency', 'first_due', 'end_date', 'account_id', 'category_id', 'reminder_days', 'notes', 'active', 'debt_id', 'created_at'],
      bill_occurrences: ['id', 'bill_id', 'due_date', 'amount'],
      bill_payments: ['id', 'occurrence_id', 'transaction_id', 'amount'],
      goals: ['id', 'name', 'target', 'target_date', 'mode', 'account_id', 'members', 'icon', 'color', 'archived', 'created_at'],
      goal_entries: ['id', 'goal_id', 'date', 'amount', 'note', 'transaction_id', 'member_id', 'created_by', 'created_at'],
      debts: ['id', 'name', 'lender', 'start_balance', 'start_date', 'rate_bp', 'min_payment', 'due_day', 'total_payments', 'payments_before', 'alert', 'reminder_days', 'account_id', 'archived', 'created_at'],
      debt_payments: ['id', 'debt_id', 'date', 'amount', 'note', 'transaction_id', 'created_by', 'created_at'],
    };
    const idCols = new Set(['id', 'account_id', 'to_account_id', 'transaction_id', 'category_id', 'recurring_id', 'bill_id', 'occurrence_id', 'goal_id', 'debt_id']);
    const userCols = new Set(['member_id', 'created_by']);
    const noHousehold = new Set(['splits', 'receipts', 'bill_payments']);
    const stats = {};
    const insertedTx = new Set();
    tx(db, () => {
      if (mode === 'replace') {
        for (const t of ['goal_entries', 'debt_payments', 'goals', 'debts', 'budgets', 'bills', 'recurring', 'people']) q(`DELETE FROM ${t} WHERE household_id=?`).run(h.id);
        q(`DELETE FROM transactions WHERE household_id=?`).run(h.id);
        q(`DELETE FROM accounts WHERE household_id=?`).run(h.id);
        q(`DELETE FROM categories WHERE household_id=?`).run(h.id);
      }
      for (const t of BACKUP_TABLES) {
        const rows = Array.isArray(b.data[t]) ? b.data[t] : [];
        const c = cols[t];
        const allCols = noHousehold.has(t) ? c : ['household_id', ...c];
        // Regla de conflicto: si el registro ya existe, se conserva el que está en la aplicación.
        const verb = 'INSERT OR IGNORE';
        const ins = q(`${verb} INTO ${t} (${allCols.join(',')}) VALUES (${allCols.map(() => '?').join(',')})`);
        let n = 0;
        for (const r of rows) {
          // Divisiones y comprobantes solo se agregan a movimientos insertados en esta restauración.
          if ((t === 'splits' || t === 'receipts') && !insertedTx.has(mapId(r.transaction_id))) continue;
          const vals = c.map((k) => {
            let v = r[k] ?? null;
            if (k === 'template' && v) {
              const tpl = JSON.parse(v);
              tpl.account_id = mapId(tpl.account_id); tpl.to_account_id = mapId(tpl.to_account_id);
              tpl.member_id = mapUser(tpl.member_id);
              tpl.splits = (tpl.splits || []).map((s) => ({ ...s, category_id: mapId(s.category_id) }));
              return JSON.stringify(tpl);
            }
            if (k === 'members' && v) return JSON.stringify(JSON.parse(v).filter((m) => memberIds.has(m) || backupPeople.has(m)).map((m) => (memberIds.has(m) ? m : mapId(m))));
            if (idCols.has(k)) return mapId(v);
            if (userCols.has(k)) return mapUser(v);
            return v;
          });
          const res = ins.run(...(noHousehold.has(t) ? vals : [h.id, ...vals]));
          if (t === 'transactions' && res.changes) insertedTx.add(vals[0]);
          n += Number(res.changes);
        }
        stats[t] = n;
      }
    });
    return { ok: true, mode, stats };
  }, { hh: true, admin: true });

  // =====================================================================
  // Atender una solicitud (sin HTTP): la llama el servidor o la versión personal.
  // req = { method, headers, socket }, res = { setHeader }; user permite indicar la persona directamente.
  // =====================================================================
  async function handle({ method, pathname, query = {}, body = {}, req, res, user: fixedUser = null }) {
    try {
      const r = routes.find((x) => x.method === method && x.re.test(pathname));
      if (!r) throw notFound('Ruta no encontrada.');
      const m = pathname.match(r.re);
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
      const token = cookies.jp_sid;
      let user = fixedUser;
      if (!user && token) {
        const s = q(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > ?`).get(sha256(token), F.nowIso());
        if (s) user = s;
      }
      if (!r.opts.public && !user) throw new HttpError(401, 'Tu sesión terminó. Vuelve a iniciar sesión.');
      const ctx = { req, res, user, token, params, query, body };
      if (r.opts.hh) {
        // Aislamiento entre hogares: solo integrantes pueden acceder; para el resto el hogar "no existe".
        const mem = q(`SELECT m.role, h.* FROM members m JOIN households h ON h.id=m.household_id WHERE m.household_id=? AND m.user_id=?`).get(params.hid, user.id);
        if (!mem) throw notFound('No encontramos este hogar o no tienes acceso.');
        const { role, ...h } = mem;
        ctx.h = h; ctx.role = role;
        if (r.opts.admin && role !== 'admin') throw new HttpError(403, 'Esta acción solo la puede hacer un administrador del hogar.');
      }
      const out = await r.handler(ctx);
      return { status: 200, data: out ?? { ok: true }, mutated: method !== 'GET' };
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, data: { error: e.message, field: e.field } };
      if (String(e.message).includes('UNIQUE constraint')) return { status: 409, data: { error: 'Este registro ya existe.' } };
      console.error(e);
      return { status: 500, data: { error: 'Algo salió mal. Tus datos no se modificaron; intenta de nuevo.' } };
    }
  }
  const hasRoute = (method, pathname) => routes.some((x) => x.method === method && x.re.test(pathname));

  return { handle, hasRoute, db };
}
