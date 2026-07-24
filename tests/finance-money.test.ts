import { describe, it, expect } from 'vitest'
import { parseCents, formatCents, formatDollars, centsToNumericString, dbToCents } from '@/lib/finance/money'

describe('parseCents', () => {
  it('parses plain and formatted amounts', () => {
    expect(parseCents('1234.56')).toBe(123456)
    expect(parseCents('$1,234.56')).toBe(123456)
    expect(parseCents('12')).toBe(1200)
    expect(parseCents('12.5')).toBe(1250)
    expect(parseCents('0.07')).toBe(7)
  })

  it('handles negatives, accounting parens, and leading +', () => {
    expect(parseCents('-12.34')).toBe(-1234)
    expect(parseCents('(12.34)')).toBe(-1234)
    expect(parseCents('+45.00')).toBe(4500)
    expect(parseCents('($1,000.00)')).toBe(-100000)
  })

  it('rounds a 3rd decimal digit', () => {
    expect(parseCents('1.005')).toBe(101)
    expect(parseCents('1.004')).toBe(100)
  })

  it('accepts trusted numbers', () => {
    expect(parseCents(12.34)).toBe(1234)
    expect(parseCents(-0.1)).toBe(-10)
  })

  it('rejects junk', () => {
    expect(parseCents('')).toBeNull()
    expect(parseCents('abc')).toBeNull()
    expect(parseCents('12.34.56')).toBeNull()
    expect(parseCents('.')).toBeNull()
    expect(parseCents(null)).toBeNull()
    expect(parseCents(NaN)).toBeNull()
  })
})

describe('formatting', () => {
  it('formats cents with commas and sign', () => {
    expect(formatCents(123456)).toBe('$1,234.56')
    expect(formatCents(-99)).toBe('-$0.99')
    expect(formatCents(50, { sign: true })).toBe('+$0.50')
    expect(formatDollars(2043300)).toBe('$20,433')
    expect(formatDollars(-149999)).toBe('-$1,500')
  })

  it('writes NUMERIC strings the db accepts', () => {
    expect(centsToNumericString(123456)).toBe('1234.56')
    expect(centsToNumericString(-50)).toBe('-0.50')
    expect(centsToNumericString(0)).toBe('0.00')
  })

  it('round-trips db numeric strings', () => {
    expect(dbToCents('1703.00')).toBe(170300)
    expect(dbToCents(null)).toBe(0)
    expect(dbToCents(centsToNumericString(2043300))).toBe(2043300)
  })
})
