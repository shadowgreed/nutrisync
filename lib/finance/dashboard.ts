/**
 * Pure dashboard math (unit-tested; pages just wire rows in).
 *
 * Sign convention: transaction amount positive = expense, negative = income.
 */

export interface TxLike {
  amount_cents: number
  category: string | null
}

export interface MonthNet {
  incomeCents: number
  expenseCents: number       // excludes 'Debt Payment' rows (counted via minimums)
  debtMinimumsCents: number
  netCents: number
}

/**
 * This month's net = income − expenses − debt minimums.
 * Logged 'Debt Payment' transactions are excluded from expenses so a card
 * payment isn't counted twice (once as a transaction, once as the minimum
 * obligation the dashboard already subtracts).
 */
export function computeMonthNet(transactions: TxLike[], debtMinimumsCents: number): MonthNet {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.amount_cents < 0) income += -t.amount_cents
    else if (t.category !== 'Debt Payment') expense += t.amount_cents
  }
  return {
    incomeCents: income,
    expenseCents: expense,
    debtMinimumsCents,
    netCents: income - expense - debtMinimumsCents,
  }
}

/** 0–100 progress toward debt-free, from the starting total down to 0. */
export function debtProgressPercent(currentDebtCents: number, startingDebtCents: number): number {
  if (startingDebtCents <= 0) return 100
  const paid = startingDebtCents - Math.min(currentDebtCents, startingDebtCents)
  return Math.max(0, Math.min(100, (paid / startingDebtCents) * 100))
}

/** '2027-11' → 'November 2027' for the projected debt-free date. */
export function formatMonthLabel(month: string | null): string {
  if (!month) return '—'
  const [y, m] = month.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return '—'
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return `${names[m - 1]} ${y}`
}

/** Current calendar month as 'YYYY-MM' (server local time is fine here). */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
