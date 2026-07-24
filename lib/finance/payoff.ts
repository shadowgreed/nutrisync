/**
 * Avalanche payoff engine — the core logic of the debt tracker. Pure and
 * integer-cents only, so it is unit-testable and float-free.
 *
 * Monthly order of operations (per spec):
 *   1. Interest accrues on every card: balance × APR / 12
 *   2. The cash buffer is funded first while below target
 *   3. Every card's minimum is paid
 *   4. Every remaining dollar goes to the highest-APR card with a balance,
 *      rolling to the next card when one hits zero
 *
 * APRs are handled in basis points (29.99% → 2999) to keep the math integral.
 */

export interface DebtCard {
  name: string
  balanceCents: number
  aprBp: number
  minPaymentCents: number
}

export interface PayoffInput {
  cards: DebtCard[]
  monthlyBudgetCents: number
  bufferMonthlyCents: number
  bufferTargetCents: number
  bufferStartCents?: number
  /** 'YYYY-MM' the first simulated month; defaults to '0001-01' (labels only). */
  startMonth?: string
}

export interface CardMonth {
  card: string
  interestCents: number
  paymentCents: number
  endBalanceCents: number
}

export interface PlanMonth {
  month: string
  bufferContributionCents: number
  bufferBalanceCents: number
  cards: CardMonth[]
  totalPaymentCents: number
  totalInterestCents: number
  remainingDebtCents: number
}

export interface PayoffPlan {
  months: PlanMonth[]
  monthCount: number
  debtFreeMonth: string | null
  totalInterestCents: number
  paidOff: boolean
}

/** Simulation cap — past this the budget clearly doesn't service the debt. */
const MAX_MONTHS = 600

/** APR percent (29.99) → basis points (2999), via string math to avoid float drift. */
export function aprToBp(apr: unknown): number {
  const s = typeof apr === 'number' ? apr.toFixed(2) : typeof apr === 'string' ? apr.trim() : ''
  const m = /^(\d{1,3})(?:\.(\d{0,2}))?$/.exec(s)
  if (!m) return 0
  return Number(m[1]) * 100 + Number(((m[2] ?? '') + '00').slice(0, 2))
}

export function bpToAprString(bp: number): string {
  return `${Math.floor(bp / 100)}.${String(bp % 100).padStart(2, '0')}`
}

/** Highest APR first; ties break by larger balance (retires the bigger drag first). */
export function avalancheOrder<T extends { aprBp: number; balanceCents: number }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => b.aprBp - a.aprBp || b.balanceCents - a.balanceCents)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}`
}

function monthlyInterest(balanceCents: number, aprBp: number): number {
  // balance × (APR/10000) / 12, rounded to the cent
  return Math.round((balanceCents * aprBp) / 10000 / 12)
}

export function computePayoffPlan(input: PayoffInput): PayoffPlan {
  const start = input.startMonth ?? '0001-01'
  const cards = input.cards.map(c => ({ ...c }))
  let buffer = input.bufferStartCents ?? 0
  let totalInterest = 0
  const months: PlanMonth[] = []
  let debtFreeMonth: string | null = null

  for (let i = 0; cards.some(c => c.balanceCents > 0) && i < MAX_MONTHS; i++) {
    const label = addMonths(start, i)
    const rows: CardMonth[] = cards.map(c => ({
      card: c.name, interestCents: 0, paymentCents: 0, endBalanceCents: c.balanceCents,
    }))

    // 1. interest
    let monthInterest = 0
    cards.forEach((c, idx) => {
      if (c.balanceCents <= 0) return
      const interest = monthlyInterest(c.balanceCents, c.aprBp)
      c.balanceCents += interest
      rows[idx].interestCents = interest
      monthInterest += interest
    })
    totalInterest += monthInterest

    // 2. buffer first
    let pool = input.monthlyBudgetCents
    let bufferContribution = 0
    if (buffer < input.bufferTargetCents) {
      bufferContribution = Math.min(input.bufferMonthlyCents, input.bufferTargetCents - buffer, pool)
      buffer += bufferContribution
      pool -= bufferContribution
    }

    // 3. minimums
    cards.forEach((c, idx) => {
      if (c.balanceCents <= 0 || pool <= 0) return
      const pay = Math.min(c.minPaymentCents, c.balanceCents, pool)
      c.balanceCents -= pay
      pool -= pay
      rows[idx].paymentCents += pay
    })

    // 4. everything left at the highest APR, rolling down
    for (const target of avalancheOrder(cards)) {
      if (pool <= 0) break
      if (target.balanceCents <= 0) continue
      const pay = Math.min(pool, target.balanceCents)
      target.balanceCents -= pay
      pool -= pay
      const row = rows.find(r => r.card === target.name)
      if (row) row.paymentCents += pay
    }

    cards.forEach((c, idx) => { rows[idx].endBalanceCents = c.balanceCents })
    const remaining = cards.reduce((sum, c) => sum + Math.max(0, c.balanceCents), 0)
    months.push({
      month: label,
      bufferContributionCents: bufferContribution,
      bufferBalanceCents: buffer,
      cards: rows,
      totalPaymentCents: rows.reduce((s, r) => s + r.paymentCents, 0),
      totalInterestCents: monthInterest,
      remainingDebtCents: remaining,
    })
    if (remaining === 0) { debtFreeMonth = label; break }
  }

  return {
    months,
    monthCount: months.length,
    debtFreeMonth,
    totalInterestCents: totalInterest,
    paidOff: debtFreeMonth !== null,
  }
}

/**
 * "vs. minimums only" comparison line.
 *
 * The literal card minimums can't be simulated as-is (a fixed minimum below
 * monthly interest — or Apple's $0 promo minimum — never amortizes), so this
 * uses the standard issuer formula: max(stated minimum, this month's interest
 * + 1% of principal, $25), capped at the balance.
 */
export function computeMinimumsOnlyPlan(cardsInput: DebtCard[]): PayoffPlan {
  const cards = cardsInput.map(c => ({ ...c }))
  let totalInterest = 0
  let monthCount = 0

  while (cards.some(c => c.balanceCents > 0) && monthCount < MAX_MONTHS) {
    monthCount++
    for (const c of cards) {
      if (c.balanceCents <= 0) continue
      const interest = monthlyInterest(c.balanceCents, c.aprBp)
      totalInterest += interest
      const principal = c.balanceCents
      c.balanceCents += interest
      const formulaMin = interest + Math.round(principal / 100)
      const pay = Math.min(c.balanceCents, Math.max(c.minPaymentCents, formulaMin, 2500))
      c.balanceCents -= pay
    }
  }

  const paidOff = cards.every(c => c.balanceCents <= 0)
  return {
    months: [],
    monthCount,
    debtFreeMonth: null,
    totalInterestCents: totalInterest,
    paidOff,
  }
}
