// Esquema de la base de datos (SQLite). Todos los importes se guardan en centavos (INTEGER).
// No depende de Node: lo usan el servidor y la versión personal.
export const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  start_day INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  color TEXT NOT NULL DEFAULT '#8b7cf6',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (household_id, user_id)
);

-- Integrantes sin cuenta (por ejemplo, hijos): solo un nombre para asignar movimientos y metas.
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#a1a1b5',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','member')),
  label TEXT,
  created_by TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_by TEXT,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','bank','savings','credit')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  opening_date TEXT NOT NULL,
  credit_limit INTEGER,
  cut_day INTEGER,
  pay_day INTEGER,
  archived INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense','income')),
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#8b7cf6',
  archived INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense','refund','transfer')),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT REFERENCES accounts(id),
  description TEXT NOT NULL,
  merchant TEXT,
  notes TEXT,
  tags TEXT,
  member_id TEXT,
  created_by TEXT,
  recurring_id TEXT,
  import_batch TEXT,
  client_id TEXT,
  has_receipt INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS tx_client ON transactions(household_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tx_recurring ON transactions(recurring_id, date) WHERE recurring_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tx_hh_date ON transactions(household_id, date);

CREATE TABLE IF NOT EXISTS splits (
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS splits_tx ON splits(transaction_id);

CREATE TABLE IF NOT EXISTS receipts (
  transaction_id TEXT PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','yearly')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category_id TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount >= 0),
  rollover INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (household_id, month, category_id)
);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('once','weekly','biweekly','monthly','yearly')),
  first_due TEXT NOT NULL,
  end_date TEXT,
  account_id TEXT,
  category_id TEXT,
  reminder_days INTEGER NOT NULL DEFAULT 3,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_occurrences (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  UNIQUE (bill_id, due_date)
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id TEXT PRIMARY KEY,
  occurrence_id TEXT NOT NULL REFERENCES bill_occurrences(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  target_date TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('account','tracking')),
  account_id TEXT,
  members TEXT NOT NULL DEFAULT '[]',
  icon TEXT NOT NULL DEFAULT 'target',
  color TEXT NOT NULL DEFAULT '#8b7cf6',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goal_entries (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  transaction_id TEXT,
  member_id TEXT,
  created_by TEXT,
  client_id TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ge_client ON goal_entries(household_id, client_id) WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lender TEXT,
  start_balance INTEGER NOT NULL CHECK (start_balance >= 0),
  start_date TEXT NOT NULL,
  rate_bp INTEGER NOT NULL DEFAULT 0,
  min_payment INTEGER NOT NULL DEFAULT 0,
  due_day INTEGER,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  transaction_id TEXT,
  client_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS dp_client ON debt_payments(household_id, client_id) WHERE client_id IS NOT NULL;
`;

// Columnas agregadas después de la primera versión (se aplican solas a bases de datos existentes).
export const MIGRATIONS = [
  ['debts', 'total_payments', 'INTEGER'],
  ['debts', 'payments_before', 'INTEGER NOT NULL DEFAULT 0'],
  ['debts', 'alert', 'INTEGER NOT NULL DEFAULT 0'],
  ['debts', 'reminder_days', 'INTEGER NOT NULL DEFAULT 3'],
  ['debts', 'account_id', 'TEXT'],
  ['bills', 'debt_id', 'TEXT'],
];

// Crea las tablas y aplica las columnas nuevas a bases de datos existentes.
export function applySchema(db) {
  db.exec(SCHEMA);
  for (const [table, col, type] of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
}

// Ejecuta fn dentro de una transacción; deshace todo si algo falla.
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
