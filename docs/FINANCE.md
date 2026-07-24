# Finance module — personal expense & debt tracker (Phase 1)

A self-contained module under `/finance` built around one goal: pay off
$20,433 of credit card debt by the avalanche method while holding a $1,000
cash buffer. Single user. It shares only auth and the Supabase client with
the rest of the app, so it can be lifted into its own project by copying
`app/finance`, `app/api/finance`, `lib/finance`, and migration 056.

## Screens

| Route | What it answers |
|---|---|
| `/finance` | This month's net (income − expenses − debt minimums), total debt + progress bar + projected debt-free date, buffer vs. $1,000 target |
| `/finance/debt` | The centerpiece: cards in avalanche order (every field editable — the order re-sorts on APR edits), monthly budget + buffer knobs, month-by-month schedule, debt-free date, total interest, vs.-minimums comparison |
| `/finance/transactions` | Month/category-filterable list, inline category edit, manual add, delete |
| `/finance/import` | Drag-drop bank/card CSV → parsed preview with keyword-suggested categories → confirm → saved with dedupe |

## Schema (migration `056_finance.sql`)

Tables are prefixed `finance_` because they share NutriSync's Postgres schema
(bare `accounts`/`transactions` are collision magnets); otherwise they follow
the planned data model exactly.

- `finance_accounts` — id, user_id, name, type (`checking|credit|savings`), plaid_account_id, current_balance, credit_limit, apr, min_payment
- `finance_transactions` — id, user_id, account_id, date, description, amount (**positive = expense, negative = income**), category, subcategory, is_recurring, plaid_transaction_id (unique), source (`plaid|csv|manual`)
- `finance_categories` — id, user_id, name, parent (null = top level; unique on (user_id, name, COALESCE(parent,'')))
- `finance_budgets` — id, user_id, category, month (`YYYY-MM`), planned_amount; also persists the two plan knobs as rows (`Debt Payment` = monthly debt budget, `Savings` = buffer contribution)
- `finance_debt_snapshots` — id, user_id, card_name, balance, apr, min_payment, snapshot_date; unique per (user, card, date) so payoff progress is a real time series (monthly close writes these in Phase 2)

**RLS**: every table has `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` — a second user cannot read or write row one.

**Money**: stored as `NUMERIC(12,2)`; supabase-js returns numeric as strings and
`lib/finance/money.ts` converts to integer cents with string math at that
boundary. All arithmetic is integer cents; no `parseFloat` on currency.

**Seeding**: a migration can't know `auth.uid()`, so `lib/finance/seed-server.ts`
runs from the `/finance` layout and no-ops unless the user has no finance data:
it inserts the five real cards (PayPal 29.99% / JetBlue 27.24% / Apple 26.24% /
BofA 24.24% / Citizens 22.24% — placeholders, editable), a Checking and a
Buffer (savings) account, the category tree, and the starting debt snapshot.

## Payoff engine (`lib/finance/payoff.ts`)

Pure, integer-cents, APRs in basis points. Monthly loop:

1. interest accrues on every card (`balance × APR ÷ 12`, rounded to the cent)
2. the buffer is funded first while below target
3. all minimums are paid
4. every remaining dollar goes to the highest-APR card, rolling to the next
   when one hits zero

Acceptance test (`tests/payoff.test.ts`): the seed cards at $1,600/mo with the
$500/mo buffer contribution must be debt-free in **16 months** with total
interest in **$3,900–4,000** (engine result: $3,928.73). If that test fails,
the core feature is wrong.

The "vs. minimums only" line can't simulate the literal statement minimums
(Apple's $0 promo minimum never amortizes), so it uses the standard issuer
formula — max(stated minimum, interest + 1% of principal, $25) — and reports
months and interest saved against that.

## CSV import (`lib/finance/csv.ts`)

Header detection for date/description/amount and debit/credit column pairs,
quoted-field CSV parsing, US date normalization. Dedupe key is
date + amount + normalized description; the import API drops rows whose key
already exists (re-importing the same file is a no-op) and dedupes within the
file itself. A preview toggle flips signs for checking-style exports where
deposits are positive.

## Phase 2 (not built yet)

- Plaid linking (sandbox) — `plaid_account_id` / `plaid_transaction_id` columns are ready; access tokens must live server-side only
- Monthly close — snapshot every card balance into `finance_debt_snapshots`
