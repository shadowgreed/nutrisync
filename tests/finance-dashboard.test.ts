import { describe, it, expect } from 'vitest'
import { computeMonthNet, debtProgressPercent, formatMonthLabel, currentMonth } from '@/lib/finance/dashboard'
import { suggestCategory } from '@/lib/finance/categorize'

describe('computeMonthNet', () => {
  it('nets income minus expenses minus debt minimums', () => {
    const net = computeMonthNet(
      [
        { amount_cents: -300_000, category: 'Income' },   // $3,000 income
        { amount_cents: 120_000, category: 'Home' },      // $1,200 rent
        { amount_cents: 40_000, category: 'Daily' },      // $400 groceries
      ],
      63_200, // $632 in card minimums
    )
    expect(net.incomeCents).toBe(300_000)
    expect(net.expenseCents).toBe(160_000)
    expect(net.netCents).toBe(300_000 - 160_000 - 63_200)
  })

  it('excludes logged Debt Payment rows so card payments are not double-counted', () => {
    const net = computeMonthNet(
      [
        { amount_cents: -300_000, category: 'Income' },
        { amount_cents: 160_000, category: 'Debt Payment' },
      ],
      63_200,
    )
    expect(net.expenseCents).toBe(0)
    expect(net.netCents).toBe(300_000 - 63_200)
  })
})

describe('debtProgressPercent', () => {
  it('is 0 at the start, grows as debt shrinks, clamps at both ends', () => {
    expect(debtProgressPercent(2_043_300, 2_043_300)).toBe(0)
    expect(debtProgressPercent(1_021_650, 2_043_300)).toBeCloseTo(50)
    expect(debtProgressPercent(0, 2_043_300)).toBe(100)
    expect(debtProgressPercent(2_500_000, 2_043_300)).toBe(0) // debt grew past start
  })
})

describe('labels', () => {
  it('formats YYYY-MM as a month name', () => {
    expect(formatMonthLabel('2027-11')).toBe('November 2027')
    expect(formatMonthLabel(null)).toBe('—')
  })
  it('currentMonth is YYYY-MM', () => {
    expect(currentMonth(new Date(2026, 6, 24))).toBe('2026-07')
  })
})

describe('suggestCategory', () => {
  it('matches the spec examples', () => {
    expect(suggestCategory('SHELL OIL 57444221')).toEqual({ category: 'Transport', subcategory: 'Fuel' })
    expect(suggestCategory('STOP & SHOP #0552')).toEqual({ category: 'Daily', subcategory: 'Groceries' })
  })
  it('returns null for unknown merchants', () => {
    expect(suggestCategory('XYZZY LLC 000')).toBeNull()
  })
})
