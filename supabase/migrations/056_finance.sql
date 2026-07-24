-- 056_finance.sql
-- Personal expense & debt tracker (Phase 1). Self-contained module: five new
-- tables, all row-scoped to auth.uid() with RLS, no references to the
-- nutrition tables so the whole feature can be lifted into its own project
-- later by copying this file.
--
-- Money is NUMERIC(12,2), never float. Application code converts to integer
-- cents at the boundary (lib/finance/money.ts) and does all arithmetic there.
-- Seed data (the real cards + category tree) is inserted per-user on first
-- visit by lib/finance/seed-server.ts — a migration can't know auth.uid().

-- ── accounts ─────────────────────────────────────────────────────────────────
CREATE TABLE finance_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('checking', 'credit', 'savings')),
  plaid_account_id TEXT,                            -- Phase 2
  current_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_limit     NUMERIC(12,2),
  apr              NUMERIC(5,2) CHECK (apr IS NULL OR (apr >= 0 AND apr <= 100)),
  min_payment      NUMERIC(12,2) CHECK (min_payment IS NULL OR min_payment >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance accounts" ON finance_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX finance_accounts_user_idx ON finance_accounts(user_id);

-- ── categories ───────────────────────────────────────────────────────────────
CREATE TABLE finance_categories (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  parent  TEXT                                      -- parent category name, null = top level
);

-- Expression index (not a table UNIQUE) because NULL parents must also dedupe:
-- UNIQUE treats NULLs as distinct, which would allow duplicate top-level rows.
CREATE UNIQUE INDEX finance_categories_user_name_parent_key
  ON finance_categories(user_id, name, COALESCE(parent, ''));

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance categories" ON finance_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX finance_categories_user_idx ON finance_categories(user_id);

-- ── transactions ─────────────────────────────────────────────────────────────
-- amount sign convention: positive = expense, negative = income.
CREATE TABLE finance_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id           UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
  date                 DATE NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  amount               NUMERIC(12,2) NOT NULL,
  category             TEXT,
  subcategory          TEXT,
  is_recurring         BOOLEAN NOT NULL DEFAULT FALSE,
  plaid_transaction_id TEXT UNIQUE,                 -- Phase 2 dedupe key
  source               TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('plaid', 'csv', 'manual')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance transactions" ON finance_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- The two read paths: month-filtered list, and import dedupe on (date, amount).
CREATE INDEX finance_transactions_user_date_idx ON finance_transactions(user_id, date DESC);

-- ── budgets ──────────────────────────────────────────────────────────────────
-- Also stores the two payoff-plan knobs as rows (categories 'Debt Payment' and
-- 'Savings') so the planned monthly debt budget / buffer contribution persist
-- without a separate settings table.
CREATE TABLE finance_budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  month          TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  planned_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (user_id, category, month)
);

ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own finance budgets" ON finance_budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX finance_budgets_user_month_idx ON finance_budgets(user_id, month);

-- ── debt_snapshots ───────────────────────────────────────────────────────────
-- One row per card per month (monthly close, Phase 2 writes these on demand;
-- the seed writes the starting snapshot) so payoff progress is real history.
CREATE TABLE finance_debt_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name     TEXT NOT NULL,
  balance       NUMERIC(12,2) NOT NULL,
  apr           NUMERIC(5,2),
  min_payment   NUMERIC(12,2),
  snapshot_date DATE NOT NULL,
  UNIQUE (user_id, card_name, snapshot_date)
);

ALTER TABLE finance_debt_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own debt snapshots" ON finance_debt_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX finance_debt_snapshots_user_date_idx ON finance_debt_snapshots(user_id, snapshot_date DESC);
