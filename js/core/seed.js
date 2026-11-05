// Categorías iniciales (editables) y datos de demostración.
import { uid, nowIso, addDays, addMonthsClamped, insertTransaction, periodOf, syncBillOccurrences, billOccurrences } from './finance.js';

export const DEFAULT_CATEGORIES = [
  ['Vivienda', 'expense', 'home', '#7aa7f7'],
  ['Supermercado', 'expense', 'cart', '#a78bfa'],
  ['Transporte', 'expense', 'car', '#60c3d8'],
  ['Salud', 'expense', 'heart', '#f49ac1'],
  ['Seguros', 'expense', 'shield', '#6fcf9f'],
  ['Educación', 'expense', 'book', '#f2b56b'],
  ['Servicios', 'expense', 'bolt', '#f59e6b'],
  ['Entretenimiento', 'expense', 'film', '#c084fc'],
  ['Suscripciones', 'expense', 'repeat', '#818cf8'],
  ['Restaurantes', 'expense', 'cup', '#fb923c'],
  ['Ropa y cuidado', 'expense', 'shirt', '#e879a8'],
  ['Deudas y préstamos', 'expense', 'card', '#94a3b8'],
  ['Regalos', 'expense', 'gift', '#f472b6'],
  ['Otros gastos', 'expense', 'dots', '#a1a1b5'],
  ['Salario', 'income', 'briefcase', '#34c38f'],
  ['Negocio propio', 'income', 'store', '#2fb3a0'],
  ['Otros ingresos', 'income', 'coin', '#5cc8a8'],
];

export function createDefaultCategories(db, hh) {
  const ins = db.prepare(`INSERT INTO categories (id, household_id, name, kind, icon, color, sort) VALUES (?,?,?,?,?,?,?)`);
  DEFAULT_CATEGORIES.forEach(([name, kind, icon, color], i) => ins.run(uid(), hh, name, kind, icon, color, i));
}

// Hogar de demostración: se crea aparte, marcado como demo, y se puede borrar sin tocar los datos personales.
export function seedDemo(db, hh, userId, today) {
  const cat = Object.fromEntries(db.prepare(`SELECT name, id FROM categories WHERE household_id=?`).all(hh).map((c) => [c.name, c.id]));
  const start = addMonthsClamped(today, -3, 1);
  const acc = (name, type, opening, extra = {}) => {
    const id = uid();
    db.prepare(`INSERT INTO accounts (id, household_id, name, type, opening_balance, opening_date, credit_limit, cut_day, pay_day, color, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, hh, name, type, opening, start, extra.limit ?? null, extra.cut ?? null, extra.pay ?? null, extra.color ?? null, nowIso());
    return id;
  };
  const bank = acc('Cuenta corriente', 'bank', 240000);
  const cash = acc('Efectivo', 'cash', 15000);
  const savings = acc('Ahorros casa', 'savings', 250000);
  const card = acc('Tarjeta Visa', 'credit', -42000, { limit: 300000, cut: 20, pay: 5 });

  const t = (type, date, amount, account, category, description, extra = {}) => {
    if (date > today) return;
    insertTransaction(db, hh, { type, date, amount, account_id: account, to_account_id: extra.to, description, merchant: extra.merchant,
      splits: type === 'transfer' ? [] : (extra.splits || [{ category_id: cat[category], amount }]), member_id: userId, created_by: userId });
  };
  for (let m = 0; m < 4; m++) {
    const base = addMonthsClamped(start, m, 1);
    const d = (day) => base.slice(0, 8) + String(day).padStart(2, '0');
    t('income', d(1), 260000, bank, 'Salario', 'Salario quincena');
    t('income', d(15), 260000, bank, 'Salario', 'Salario quincena');
    t('expense', d(2), 135000, bank, 'Vivienda', 'Renta del departamento');
    t('expense', d(4), 8200 + m * 350, card, 'Supermercado', 'Supermercado semanal', { merchant: 'Mercado Central' });
    t('expense', d(11), 9650 - m * 200, card, 'Supermercado', 'Supermercado semanal', { merchant: 'Mercado Central' });
    t('expense', d(18), 7740, card, 'Supermercado', 'Supermercado semanal', { merchant: 'Mercado Central' });
    t('expense', d(7), 4500, cash, 'Transporte', 'Gasolina');
    t('expense', d(9), 9500, bank, 'Servicios', 'Electricidad');
    t('expense', d(12), 1599, card, 'Suscripciones', 'Streaming familiar');
    t('expense', d(14), 6230, card, 'Restaurantes', 'Cena en familia');
    t('expense', d(21), 12000, bank, 'Educación', 'Clases de inglés');
    t('expense', d(23), 5400, card, 'Entretenimiento', 'Cine y palomitas');
    t('transfer', d(16), 30000, bank, null, 'Aporte a Ahorros casa', { to: savings });
    t('transfer', d(6), 42000, bank, null, 'Pago de Tarjeta Visa', { to: card });
  }
  // Compra dividida en dos categorías
  t('expense', addDays(today, -3), 15800, card, null, 'Compra en tienda departamental', { merchant: 'Tienda Sol',
    splits: [{ category_id: cat['Supermercado'], amount: 9800 }, { category_id: cat['Ropa y cuidado'], amount: 6000 }] });
  t('refund', addDays(today, -1), 2500, card, 'Ropa y cuidado', 'Devolución de camiseta', { merchant: 'Tienda Sol' });

  // Presupuesto del período actual
  const month = periodOf(today, 1);
  const bud = db.prepare(`INSERT OR REPLACE INTO budgets (household_id, month, category_id, amount, rollover) VALUES (?,?,?,?,?)`);
  [['Vivienda', 135000], ['Supermercado', 40000], ['Transporte', 10000], ['Servicios', 15000], ['Restaurantes', 8000],
    ['Entretenimiento', 6000], ['Suscripciones', 2000], ['Educación', 12000], ['Ropa y cuidado', 5000]]
    .forEach(([n, a]) => bud.run(hh, month, cat[n], a, n === 'Restaurantes' ? 1 : 0));

  // Facturas
  const bill = (name, amount, freq, firstDue, category, account) => db.prepare(`INSERT INTO bills (id, household_id, name, amount, frequency, first_due, account_id, category_id, reminder_days, created_at)
    VALUES (?,?,?,?,?,?,?,?,3,?)`).run(uid(), hh, name, amount, freq, firstDue, account, cat[category], nowIso());
  const nextDay = (day) => { const cand = today.slice(0, 8) + String(day).padStart(2, '0'); return cand; };
  bill('Internet hogar', 6500, 'monthly', addMonthsClamped(nextDay(10), -1), 'Servicios', bank);
  bill('Seguro del auto', 18900, 'monthly', addMonthsClamped(nextDay(25), -1), 'Seguros', bank);
  bill('Agua', 3200, 'monthly', addMonthsClamped(nextDay(17), -1), 'Servicios', cash);
  bill('Membresía anual del club', 24000, 'yearly', addDays(today, 40), 'Entretenimiento', card);
  // Las facturas ya vencidas aparecen pagadas, salvo el agua (para mostrar una factura vencida).
  syncBillOccurrences(db, hh, today);
  for (const o of billOccurrences(db, hh, '0000-01-01', addDays(today, -1), today)) {
    if (o.name === 'Agua' && o.due_date >= addDays(today, -31)) continue;
    const txId = insertTransaction(db, hh, { type: 'expense', date: o.due_date, amount: o.amount, account_id: o.account_id, description: o.name,
      splits: [{ category_id: o.category_id, amount: o.amount }], member_id: userId, created_by: userId });
    db.prepare(`INSERT INTO bill_payments (id, occurrence_id, transaction_id, amount) VALUES (?,?,?,?)`).run(uid(), o.id, txId, o.amount);
  }

  // Metas
  const goal = (name, target, mode, account, icon, color, date) => {
    const id = uid();
    db.prepare(`INSERT INTO goals (id, household_id, name, target, target_date, mode, account_id, members, icon, color, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, hh, name, target, date, mode, account, JSON.stringify([userId]), icon, color, nowIso());
    return id;
  };
  goal('Nuestra casa', 1000000, 'account', savings, 'home', '#7aa7f7', addMonthsClamped(today, 30));
  const fe = goal('Fondo de emergencia', 300000, 'tracking', null, 'shield', '#6fcf9f', null);
  const trip = goal('Viaje en familia', 150000, 'tracking', null, 'plane', '#a78bfa', addMonthsClamped(today, 8));
  const entry = (g, amount, date, note) => db.prepare(`INSERT INTO goal_entries (id, goal_id, household_id, date, amount, note, member_id, created_by, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(uid(), g, hh, date, amount, note, userId, userId, nowIso());
  entry(fe, 100000, start, 'Saldo inicial');
  entry(fe, 20000, addDays(today, -20), 'Aportación mensual');
  entry(trip, 50000, addDays(today, -40), 'Aportación');
  entry(trip, -5000, addDays(today, -10), 'Retiro para reservación');

  // Deuda de seguimiento manual
  db.prepare(`INSERT INTO debts (id, household_id, name, lender, start_balance, start_date, rate_bp, min_payment, due_day, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(uid(), hh, 'Préstamo del auto', 'Banco Ejemplo', 820000, start, 899, 32000, 12, nowIso());
}
