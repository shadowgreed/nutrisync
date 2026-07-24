import { describe, it, expect } from 'vitest'
import { parseCsvText, parseBankCsv, normalizeDate, dedupeKey } from '@/lib/finance/csv'

describe('parseCsvText', () => {
  it('handles quoted fields with commas and escaped quotes', () => {
    const grid = parseCsvText('a,"b, c","say ""hi"""\n1,2,3')
    expect(grid).toEqual([['a', 'b, c', 'say "hi"'], ['1', '2', '3']])
  })

  it('handles CRLF and skips blank lines', () => {
    const grid = parseCsvText('a,b\r\n\r\n1,2\r\n')
    expect(grid).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('normalizeDate', () => {
  it('normalizes common US formats', () => {
    expect(normalizeDate('01/31/2026')).toBe('2026-01-31')
    expect(normalizeDate('1/5/26')).toBe('2026-01-05')
    expect(normalizeDate('2026-01-31')).toBe('2026-01-31')
  })
  it('rejects junk', () => {
    expect(normalizeDate('31/01/2026')).toBeNull() // month 31
    expect(normalizeDate('yesterday')).toBeNull()
  })
})

describe('parseBankCsv', () => {
  it('parses a card-style CSV (positive = charge) and skips bad rows', () => {
    const csv = [
      'Date,Description,Amount',
      '01/05/2026,SHELL OIL 5744,45.20',
      '01/06/2026,"STOP & SHOP #0552",112.09',
      '01/07/2026,PAYMENT RECEIVED,-500.00',
      'garbage,row,',
    ].join('\n')
    const { rows, skipped } = parseBankCsv(csv)
    expect(rows).toEqual([
      { date: '2026-01-05', description: 'SHELL OIL 5744', amountCents: 4520 },
      { date: '2026-01-06', description: 'STOP & SHOP #0552', amountCents: 11209 },
      { date: '2026-01-07', description: 'PAYMENT RECEIVED', amountCents: -50000 },
    ])
    expect(skipped).toBe(1)
  })

  it('inverts signs for checking-style exports when asked', () => {
    const csv = 'Date,Description,Amount\n01/05/2026,FEDEX PAYROLL,850.00\n01/06/2026,SHELL,-45.20'
    const { rows } = parseBankCsv(csv, { invertAmounts: true })
    expect(rows[0].amountCents).toBe(-85000) // deposit → income
    expect(rows[1].amountCents).toBe(4520)   // debit → expense
  })

  it('understands separate debit/credit columns', () => {
    const csv = [
      'Posted Date,Payee,Debit,Credit',
      '01/05/2026,SHELL,45.20,',
      '01/06/2026,FEDEX PAYROLL,,850.00',
    ].join('\n')
    const { rows } = parseBankCsv(csv)
    expect(rows).toEqual([
      { date: '2026-01-05', description: 'SHELL', amountCents: 4520 },
      { date: '2026-01-06', description: 'FEDEX PAYROLL', amountCents: -85000 },
    ])
  })

  it('falls back to positional columns for headerless files', () => {
    const csv = '01/05/2026,SHELL,45.20\n01/06/2026,DUNKIN,3.75'
    const { rows } = parseBankCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[1]).toEqual({ date: '2026-01-06', description: 'DUNKIN', amountCents: 375 })
  })
})

describe('dedupeKey', () => {
  it('normalizes case and whitespace so re-imports match', () => {
    expect(dedupeKey('2026-01-05', 4520, 'Shell  Oil 5744'))
      .toBe(dedupeKey('2026-01-05', 4520, 'SHELL OIL   5744 '))
  })
  it('differs when any component differs', () => {
    const base = dedupeKey('2026-01-05', 4520, 'SHELL')
    expect(dedupeKey('2026-01-06', 4520, 'SHELL')).not.toBe(base)
    expect(dedupeKey('2026-01-05', 4521, 'SHELL')).not.toBe(base)
    expect(dedupeKey('2026-01-05', 4520, 'MOBIL')).not.toBe(base)
  })
})
