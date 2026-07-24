import { describe, it, expect } from 'vitest'
import {
  computePayoffPlan,
  computeMinimumsOnlyPlan,
  avalancheOrder,
  aprToBp,
  bpToAprString,
  addMonths,
  type DebtCard,
} from '@/lib/finance/payoff'
import { SEED_CARDS, DEFAULT_DEBT_BUDGET_CENTS, DEFAULT_BUFFER_MONTHLY_CENTS, BUFFER_TARGET_CENTS, STARTING_DEBT_CENTS } from '@/lib/finance/seed'

const seedCards = (): DebtCard[] => SEED_CARDS.map(c => ({
  name: c.name,
  balanceCents: c.balanceCents,
  aprBp: c.aprBp,
  minPaymentCents: c.minPaymentCents,
}))

describe('computePayoffPlan — required acceptance test', () => {
  // Spec: seed cards at $1,600/mo (with $500/mo buffer contribution until the
  // $1,000 buffer is full) must be debt-free in 16 months with total interest
  // in the $3,900–4,000 range. If this fails, the core feature is wrong.
  it('pays off the seed cards in 16 months with ~$3.9k interest at $1600/mo', () => {
    const plan = computePayoffPlan({
      cards: seedCards(),
      monthlyBudgetCents: DEFAULT_DEBT_BUDGET_CENTS,
      bufferMonthlyCents: DEFAULT_BUFFER_MONTHLY_CENTS,
      bufferTargetCents: BUFFER_TARGET_CENTS,
      bufferStartCents: 0,
    })
    expect(plan.paidOff).toBe(true)
    expect(plan.monthCount).toBe(16)
    expect(plan.totalInterestCents).toBeGreaterThanOrEqual(390_000)
    expect(plan.totalInterestCents).toBeLessThanOrEqual(400_000)
  })

  it('seed totals $20,433 (the progress bar anchor)', () => {
    expect(STARTING_DEBT_CENTS).toBe(2_043_300)
  })
})

describe('computePayoffPlan — mechanics', () => {
  it('funds the buffer before extra debt payments, then redirects to debt', () => {
    const plan = computePayoffPlan({
      cards: seedCards(),
      monthlyBudgetCents: 160_000,
      bufferMonthlyCents: 50_000,
      bufferTargetCents: 100_000,
      bufferStartCents: 0,
    })
    expect(plan.months[0].bufferContributionCents).toBe(50_000)
    expect(plan.months[1].bufferContributionCents).toBe(50_000)
    expect(plan.months[1].bufferBalanceCents).toBe(100_000)
    expect(plan.months[2].bufferContributionCents).toBe(0)
    // Months 1–2 have $500 less going to debt than month 3
    expect(plan.months[2].totalPaymentCents - plan.months[0].totalPaymentCents).toBe(50_000)
  })

  it('a partially-funded buffer only takes what it needs', () => {
    const plan = computePayoffPlan({
      cards: seedCards(),
      monthlyBudgetCents: 160_000,
      bufferMonthlyCents: 50_000,
      bufferTargetCents: 100_000,
      bufferStartCents: 80_000,
    })
    expect(plan.months[0].bufferContributionCents).toBe(20_000)
    expect(plan.months[0].bufferBalanceCents).toBe(100_000)
  })

  it('sends the extra dollar to the highest-APR card (PayPal first at seed APRs)', () => {
    const plan = computePayoffPlan({
      cards: seedCards(),
      monthlyBudgetCents: 160_000,
      bufferMonthlyCents: 0,
      bufferTargetCents: 0,
    })
    const m1 = plan.months[0]
    const paypal = m1.cards.find(c => c.card === 'PayPal')!
    const jetblue = m1.cards.find(c => c.card === 'JetBlue')!
    // PayPal gets min + all extra; JetBlue only its minimum
    expect(paypal.paymentCents).toBeGreaterThan(5700)
    expect(jetblue.paymentCents).toBe(35_400)
  })

  it('re-orders automatically when an APR is edited', () => {
    const cards = seedCards()
    const jetblue = cards.find(c => c.name === 'JetBlue')!
    jetblue.aprBp = 3199 // corrected from a statement — now the highest
    expect(avalancheOrder(cards)[0].name).toBe('JetBlue')

    const plan = computePayoffPlan({
      cards,
      monthlyBudgetCents: 160_000,
      bufferMonthlyCents: 0,
      bufferTargetCents: 0,
    })
    const m1jb = plan.months[0].cards.find(c => c.card === 'JetBlue')!
    expect(m1jb.paymentCents).toBeGreaterThan(35_400) // min + extra
  })

  it('rolls a paid-off card\'s payment into the next card', () => {
    const cards: DebtCard[] = [
      { name: 'Small', balanceCents: 10_000, aprBp: 3000, minPaymentCents: 2_500 },
      { name: 'Big', balanceCents: 500_000, aprBp: 2000, minPaymentCents: 10_000 },
    ]
    const plan = computePayoffPlan({
      cards,
      monthlyBudgetCents: 50_000,
      bufferMonthlyCents: 0,
      bufferTargetCents: 0,
    })
    const m1 = plan.months[0]
    expect(m1.cards.find(c => c.card === 'Small')!.endBalanceCents).toBe(0)
    // Whatever Small didn't need rolled into Big the same month
    expect(m1.totalPaymentCents).toBe(50_000)
    const m2 = plan.months[1]
    expect(m2.cards.find(c => c.card === 'Small')!.paymentCents).toBe(0)
    expect(m2.cards.find(c => c.card === 'Big')!.paymentCents).toBe(50_000)
  })

  it('reports not paid off when the budget cannot service the debt', () => {
    const plan = computePayoffPlan({
      cards: [{ name: 'Card', balanceCents: 1_000_000, aprBp: 2999, minPaymentCents: 0 }],
      monthlyBudgetCents: 1_000, // $10/mo against ~$25/mo interest
      bufferMonthlyCents: 0,
      bufferTargetCents: 0,
    })
    expect(plan.paidOff).toBe(false)
    expect(plan.debtFreeMonth).toBeNull()
  })

  it('labels schedule months from startMonth', () => {
    const plan = computePayoffPlan({
      cards: [{ name: 'Card', balanceCents: 10_000, aprBp: 0, minPaymentCents: 0 }],
      monthlyBudgetCents: 5_000,
      bufferMonthlyCents: 0,
      bufferTargetCents: 0,
      startMonth: '2026-11',
    })
    expect(plan.months.map(m => m.month)).toEqual(['2026-11', '2026-12'])
    expect(plan.debtFreeMonth).toBe('2026-12')
  })
})

describe('computeMinimumsOnlyPlan', () => {
  it('takes far longer and costs far more interest than the avalanche plan', () => {
    const avalanche = computePayoffPlan({
      cards: seedCards(),
      monthlyBudgetCents: DEFAULT_DEBT_BUDGET_CENTS,
      bufferMonthlyCents: DEFAULT_BUFFER_MONTHLY_CENTS,
      bufferTargetCents: BUFFER_TARGET_CENTS,
    })
    const mins = computeMinimumsOnlyPlan(seedCards())
    expect(mins.paidOff).toBe(true)
    expect(mins.monthCount).toBeGreaterThan(avalanche.monthCount * 2)
    expect(mins.totalInterestCents).toBeGreaterThan(avalanche.totalInterestCents)
  })
})

describe('apr helpers', () => {
  it('round-trips APR strings through basis points', () => {
    expect(aprToBp('29.99')).toBe(2999)
    expect(aprToBp(26.24)).toBe(2624)
    expect(aprToBp('22')).toBe(2200)
    expect(bpToAprString(2999)).toBe('29.99')
    expect(bpToAprString(2200)).toBe('22.00')
  })

  it('rejects junk APRs as 0', () => {
    expect(aprToBp('abc')).toBe(0)
    expect(aprToBp(null)).toBe(0)
  })
})

describe('addMonths', () => {
  it('crosses year boundaries', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', 0)).toBe('2026-01')
  })
})
