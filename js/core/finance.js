// Cálculos financieros: fechas, períodos, saldos, recurrencias, facturas, presupuestos y metas.
// Regla general: todos los importes son enteros en centavos.
export const uid = () => globalThis.crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
// Huella determinista de 128 bits (no es para seguridad): sirve para crear identificadores estables al restaurar.
export function hashHex(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [h1 ^ h2 ^ h3 ^ h4, h2 ^ h1, h3 ^ h1, h4 ^ h1].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ---------- Fechas (cadenas YYYY-MM-DD, sin horas para evitar desfases) ----------
export function todayIn(tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const toUTC = (s) => new Date(s + 'T00:00:00Z');
const fmt = (d) => d.toISOString().slice(0, 10);
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1-12
export function addDays(s, n) { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }
export function addMonthsClamped(s, n, anchorDay) {
  const [y, m, d] = s.split('-').map(Number);
  const day = anchorDay || d;
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(day, daysInMonth(ny, nm))).padStart(2, '0')}`;
}
// n-ésima ocurrencia desde la fecha inicial (sin acumular desfases de fin de mes).
export function nthOccurrence(start, freq, n) {
  const day = Number(start.slice(8, 10));
  switch (freq) {
    case 'weekly': return addDays(start, 7 * n);
    case 'biweekly': return addDays(start, 14 * n);
    case 'monthly': return addMonthsClamped(start, n, day);
    case 'yearly': return addMonthsClamped(start, 12 * n, day);
    case 'once': return n === 0 ? start : null;
    default: throw new Error('Frecuencia no válida');
  }
}
export function occurrencesBetween(start, freq, from, to, end) {
  const out = [];
  for (let n = 0; n < 2000; n++) {
    const d = nthOccurrence(start, freq, n);
    if (!d || d > to || (end && d > end)) break;
    if (d >= from) out.push(d);
  }
  return out;
}

// ---------- Período del presupuesto ----------
// El mes "YYYY-MM" va del día de inicio de ese mes hasta el día anterior al inicio del mes siguiente.
export function periodRange(month, startDay) {
  const sd = Math.min(Math.max(1, startDay || 1), 28);
  const from = `${month}-${String(sd).padStart(2, '0')}`;
  const to = addDays(addMonthsClamped(from, 1, sd), -1);
  return { from, to };
}
export function periodOf(date, startDay) {
  const sd = Math.min(Math.max(1, startDay || 1), 28);
  const ym = date.slice(0, 7);
  return Number(date.slice(8, 10)) >= sd ? ym : addMonthsClamped(ym + '-01', -1).slice(0, 7);
}
export const prevMonth = (month) => addMonthsClamped(month + '-01', -1).slice(0, 7);
export const nextMonth = (month) => addMonthsClamped(month + '-01', 1).slice(0, 7);
export const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

// ---------- Dinero ----------
// Convierte texto o número a centavos exactos (acepta "1.234,56", "1,234.56", "12.5").
export function toCents(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return NaN;
    return Math.round(v * 100);
  }
  if (typeof v !== 'string') return NaN;
  let s = v.trim().replace(/[^\d.,\-]/g, '');
  if (!s) return NaN;
  const neg = s.startsWith('-');
  s = s.replace(/-/g, '');
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
  const decPos = Math.max(lastDot, lastComma);
  let intPart = s, decPart = '';
  if (decPos >= 0 && s.length - decPos - 1 <= 2 && s.length - decPos - 1 > 0) {
    intPart = s.slice(0, decPos); decPart = s.slice(decPos + 1);
  }
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart)) return NaN;
  const cents = Number(intPart || '0') * 100 + Number((decPart + '00').slice(0, 2));
  return neg ? -cents : cents;
}

// ---------- Saldos ----------
// Saldo de cada cuenta hasta una fecha. Solo cuentan movimientos desde la fecha del saldo inicial.
// Tarjetas: el saldo es negativo cuando se debe dinero.
export function accountBalances(db, hh, asOf) {
  const rows = db.prepare(`
    SELECT a.*,
      a.opening_balance
      + COALESCE((SELECT SUM(CASE WHEN t.type IN ('income','refund') THEN t.amount ELSE -t.amount END)
          FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL AND t.date >= a.opening_date AND t.date <= ?), 0)
      + COALESCE((SELECT SUM(t.amount) FROM transactions t
          WHERE t.to_account_id = a.id AND t.type = 'transfer' AND t.deleted_at IS NULL AND t.date >= a.opening_date AND t.date <= ?), 0)
      AS balance
    FROM accounts a WHERE a.household_id = ? ORDER BY a.archived, a.created_at`).all(asOf, asOf, hh);
  return rows;
}

// Ingresos y gastos de un rango (las transferencias no cuentan; las devoluciones reducen el gasto).
export function incomeExpense(db, hh, from, to) {
  const r = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) AS expense,
      COALESCE(SUM(CASE WHEN type='refund' THEN amount END),0) AS refunds
    FROM transactions WHERE household_id=? AND deleted_at IS NULL AND date BETWEEN ? AND ?`).get(hh, from, to);
  return { income: r.income, expense: r.expense - r.refunds, grossExpense: r.expense, refunds: r.refunds };
}

export function categorySpending(db, hh, from, to) {
  return db.prepare(`SELECT s.category_id AS id,
      SUM(CASE WHEN t.type='expense' THEN s.amount WHEN t.type='refund' THEN -s.amount ELSE 0 END) AS spent,
      SUM(CASE WHEN t.type='income' THEN s.amount ELSE 0 END) AS earned
    FROM splits s JOIN transactions t ON t.id = s.transaction_id
    WHERE t.household_id=? AND t.deleted_at IS NULL AND t.date BETWEEN ? AND ?
    GROUP BY s.category_id`).all(hh, from, to);
}

// ---------- Movimientos recurrentes ----------
// Crea los movimientos que ya vencieron. Es idempotente gracias al índice único (recurring_id, date).
export function materializeRecurring(db, hh, today) {
  const rules = db.prepare(`SELECT * FROM recurring WHERE household_id=? AND active=1`).all(hh);
  let created = 0;
  for (const r of rules) {
    const tpl = JSON.parse(r.template);
    const dates = occurrencesBetween(r.start_date, r.frequency, r.start_date, today, r.end_date);
    for (const d of dates) {
      const exists = db.prepare(`SELECT 1 FROM transactions WHERE recurring_id=? AND date=?`).get(r.id, d);
      if (exists) continue;
      insertTransaction(db, hh, { ...tpl, date: d, recurring_id: r.id, created_by: r.created_by });
      created++;
    }
  }
  return created;
}

export function insertTransaction(db, hh, t) {
  const id = t.id || uid();
  const ts = nowIso();
  db.prepare(`INSERT INTO transactions (id, household_id, type, date, amount, account_id, to_account_id, description, merchant, notes, tags,
      member_id, created_by, recurring_id, import_batch, client_id, has_receipt, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, hh, t.type, t.date, t.amount, t.account_id, t.type === 'transfer' ? t.to_account_id : null,
    t.description, t.merchant || null, t.notes || null, t.tags && t.tags.length ? JSON.stringify(t.tags) : null,
    t.member_id || null, t.created_by || null, t.recurring_id || null, t.import_batch || null, t.client_id || null,
    t.receipt ? 1 : 0, t.created_at || ts, ts);
  if (t.type !== 'transfer') {
    const ins = db.prepare(`INSERT INTO splits (transaction_id, category_id, amount) VALUES (?,?,?)`);
    for (const s of t.splits) ins.run(id, s.category_id, s.amount);
  }
  if (t.receipt) db.prepare(`INSERT INTO receipts (transaction_id, data) VALUES (?,?)`).run(id, t.receipt);
  return id;
}

// ---------- Facturas ----------
// Genera las fechas de vencimiento hasta "hasta" (sin duplicar) y devuelve el estado de cada una.
export function syncBillOccurrences(db, hh, until) {
  const bills = db.prepare(`SELECT * FROM bills WHERE household_id=? AND active=1`).all(hh);
  const ins = db.prepare(`INSERT OR IGNORE INTO bill_occurrences (id, bill_id, household_id, due_date, amount) VALUES (?,?,?,?,?)`);
  for (const b of bills) {
    for (const d of occurrencesBetween(b.first_due, b.frequency, b.first_due, until, b.end_date)) ins.run(uid(), b.id, hh, d, b.amount);
  }
}

export function billOccurrences(db, hh, from, to, today) {
  const rows = db.prepare(`
    SELECT o.*, b.name, b.frequency, b.account_id, b.category_id, b.reminder_days, b.active, b.notes,
      COALESCE((SELECT SUM(p.amount) FROM bill_payments p JOIN transactions t ON t.id = p.transaction_id
        WHERE p.occurrence_id = o.id AND t.deleted_at IS NULL), 0) AS paid
    FROM bill_occurrences o JOIN bills b ON b.id = o.bill_id
    WHERE o.household_id = ? AND o.due_date BETWEEN ? AND ?
    ORDER BY o.due_date, b.name`).all(hh, from, to);
  return rows.map((o) => withStatus(o, today));
}

export function withStatus(o, today) {
  const remaining = Math.max(0, o.amount - o.paid);
  let status = remaining === 0 ? 'paid' : (o.due_date < today ? 'overdue' : 'pending');
  return { ...o, remaining, status, partial: o.paid > 0 && remaining > 0 };
}

// ---------- Presupuestos ----------
// Devuelve presupuesto, acumulado del mes anterior (si se eligió acumular), gastado y restante por categoría.
export function budgetFor(db, hh, month, startDay, depth = 0) {
  const { from, to } = periodRange(month, startDay);
  const rows = db.prepare(`SELECT * FROM budgets WHERE household_id=? AND month=?`).all(hh, month);
  const spentMap = Object.fromEntries(categorySpending(db, hh, from, to).map((r) => [r.id, r.spent]));
  const totals = incomeExpense(db, hh, from, to);
  let prev = null;
  const needsPrev = rows.some((r) => r.rollover);
  if (needsPrev && depth < 12) prev = budgetFor(db, hh, prevMonth(month), startDay, depth + 1);
  const lines = rows.filter((r) => r.category_id !== '').map((r) => {
    const spent = spentMap[r.category_id] || 0;
    let carried = 0;
    if (r.rollover && prev) {
      const p = prev.lines.find((l) => l.category_id === r.category_id);
      if (p) carried = Math.max(0, p.remaining);
    }
    const available = r.amount + carried;
    return { category_id: r.category_id, amount: r.amount, rollover: !!r.rollover, carried, spent, available, remaining: available - spent };
  });
  const general = rows.find((r) => r.category_id === '');
  const catTotal = lines.reduce((s, l) => s + l.available, 0);
  const totalBudget = general ? general.amount : catTotal;
  return {
    month, from, to, lines,
    general: general ? { amount: general.amount } : null,
    totalBudget,
    totalSpent: totals.expense,
    remaining: totalBudget - totals.expense,
    unbudgetedSpent: Object.entries(spentMap).filter(([id]) => !lines.some((l) => l.category_id === id)).reduce((s, [, v]) => s + Math.max(0, v), 0),
  };
}

// ---------- Metas ----------
// "account": el dinero está apartado en una cuenta propia; el avance es el saldo de esa cuenta.
// "tracking": solo seguimiento; el dinero sigue en otras cuentas y NO se suma de nuevo al ahorro.
export function goalsWithProgress(db, hh, today) {
  const balances = Object.fromEntries(accountBalances(db, hh, today).map((a) => [a.id, a.balance]));
  const goals = db.prepare(`SELECT * FROM goals WHERE household_id=? ORDER BY archived, created_at`).all(hh);
  return goals.map((g) => {
    const entries = db.prepare(`SELECT e.* FROM goal_entries e LEFT JOIN transactions t ON t.id = e.transaction_id
      WHERE e.goal_id=? AND (e.transaction_id IS NULL OR t.deleted_at IS NULL) ORDER BY e.date DESC, e.created_at DESC`).all(g.id);
    const tracked = entries.reduce((s, e) => s + e.amount, 0);
    const saved = g.mode === 'account' ? Math.max(0, balances[g.account_id] ?? 0) : Math.max(0, tracked);
    let monthlyNeeded = null;
    if (g.target_date && g.target_date > today && saved < g.target) {
      const [y1, m1] = today.split('-').map(Number), [y2, m2] = g.target_date.split('-').map(Number);
      const months = Math.max(1, (y2 - y1) * 12 + (m2 - m1));
      monthlyNeeded = Math.ceil((g.target - saved) / months);
    }
    return { ...g, members: JSON.parse(g.members || '[]'), saved, pct: Math.min(100, Math.round((saved / g.target) * 100)), entries, monthlyNeeded };
  });
}

// ---------- Deudas ----------
export function debtsWithBalance(db, hh) {
  const debts = db.prepare(`SELECT * FROM debts WHERE household_id=? ORDER BY archived, created_at`).all(hh);
  return debts.map((d) => {
    const payments = db.prepare(`SELECT p.* FROM debt_payments p LEFT JOIN transactions t ON t.id = p.transaction_id
      WHERE p.debt_id=? AND (p.transaction_id IS NULL OR t.deleted_at IS NULL) ORDER BY p.date DESC`).all(d.id);
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, d.start_balance - paid);
    // Pagos hechos = los que ya llevaba antes de usar la app + los registrados aquí.
    const paymentsMade = (d.payments_before || 0) + payments.length;
    const paymentsLeft = d.total_payments ? Math.max(0, d.total_payments - paymentsMade) : null;
    return { ...d, payments, paid, balance, paymentsMade, paymentsLeft, projection: projectDebt(balance, d.rate_bp, d.min_payment) };
  });
}

// Proyección simple: interés mensual = tasa anual / 12, pago fijo mensual igual al pago mínimo.
export function projectDebt(balance, rateBp, payment) {
  const assumptions = [
    `Pago mensual fijo de ${payment / 100}`,
    `Tasa anual de ${(rateBp / 100).toFixed(2)} %, aplicada cada mes como tasa/12`,
    'Sin cargos nuevos ni pagos extraordinarios',
  ];
  if (balance <= 0) return { months: 0, totalInterest: 0, assumptions };
  if (!payment) return { months: null, totalInterest: null, reason: 'Agrega un pago mensual para calcular la proyección.', assumptions };
  let b = balance, months = 0, interest = 0;
  const r = rateBp / 10000 / 12;
  while (b > 0 && months < 600) {
    const i = Math.round(b * r);
    if (payment <= i) return { months: null, totalInterest: null, reason: 'El pago mensual no cubre los intereses: la deuda no bajaría.', assumptions };
    interest += i; b = b + i - payment; months++;
  }
  return { months, totalInterest: interest, assumptions };
}
