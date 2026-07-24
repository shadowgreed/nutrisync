/**
 * Bank/card CSV parsing for the import screen. Handles quoted fields, CRLF,
 * debit/credit column pairs, and the common US date formats. Output amounts
 * follow the app convention: positive cents = expense, negative = income.
 */

import { parseCents } from './money'

export interface ParsedTransaction {
  date: string // YYYY-MM-DD
  description: string
  amountCents: number
}

export interface ParseResult {
  rows: ParsedTransaction[]
  skipped: number // lines that had no parsable date/amount
}

/** RFC-4180-ish CSV → array of rows of fields. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some(f => f.trim() !== '')) rows.push(row)
  return rows
}

/** "01/31/2026", "1/31/26", "2026-01-31" → "2026-01-31"; null if unrecognizable. */
export function normalizeDate(s: string): string | null {
  const t = s.trim()
  let y: number, m: number, d: number
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t)
  if (match) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3])
  } else {
    match = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t)
    if (!match) return null
    m = Number(match[1]); d = Number(match[2]); y = Number(match[3])
    if (y < 100) y += 2000
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const DATE_HEADERS = ['date', 'transaction date', 'posted date', 'posting date', 'trans date']
const DESC_HEADERS = ['description', 'payee', 'name', 'memo', 'merchant', 'details']
const AMOUNT_HEADERS = ['amount', 'transaction amount']
const DEBIT_HEADERS = ['debit', 'withdrawal', 'withdrawals', 'money out']
const CREDIT_HEADERS = ['credit', 'deposit', 'deposits', 'money in']

function findColumn(headers: string[], names: string[]): number {
  const lower = headers.map(h => h.trim().toLowerCase())
  for (const name of names) {
    const exact = lower.indexOf(name)
    if (exact !== -1) return exact
  }
  for (const name of names) {
    const partial = lower.findIndex(h => h.includes(name))
    if (partial !== -1) return partial
  }
  return -1
}

/**
 * Parse a whole CSV file. `invertAmounts` flips signs for exports where
 * charges come through negative (checking-account style) — the import preview
 * exposes this as a toggle, defaulting to spec convention positive = expense.
 */
export function parseBankCsv(text: string, opts: { invertAmounts?: boolean } = {}): ParseResult {
  const grid = parseCsvText(text)
  if (grid.length === 0) return { rows: [], skipped: 0 }

  const header = grid[0]
  let dateCol = findColumn(header, DATE_HEADERS)
  let descCol = findColumn(header, DESC_HEADERS)
  let amountCol = findColumn(header, AMOUNT_HEADERS)
  const debitCol = findColumn(header, DEBIT_HEADERS)
  const creditCol = findColumn(header, CREDIT_HEADERS)
  const hasHeader = dateCol !== -1 && (amountCol !== -1 || debitCol !== -1)

  let dataRows = grid
  if (hasHeader) {
    dataRows = grid.slice(1)
  } else {
    // Headerless export: assume date, description, amount by position.
    dateCol = 0; descCol = 1; amountCol = 2
  }

  const rows: ParsedTransaction[] = []
  let skipped = 0
  for (const r of dataRows) {
    const date = normalizeDate(r[dateCol] ?? '')
    let amountCents: number | null = null
    if (amountCol !== -1 && r[amountCol]?.trim()) {
      amountCents = parseCents(r[amountCol])
      if (amountCents !== null && opts.invertAmounts) amountCents = -amountCents
    } else if (debitCol !== -1 || creditCol !== -1) {
      // Debit/credit pairs are unambiguous: debit = expense (+), credit = income (−).
      const debit = debitCol !== -1 ? parseCents(r[debitCol]) : null
      const credit = creditCol !== -1 ? parseCents(r[creditCol]) : null
      if (debit !== null && debit !== 0) amountCents = Math.abs(debit)
      else if (credit !== null && credit !== 0) amountCents = -Math.abs(credit)
    }
    if (date === null || amountCents === null) { skipped++; continue }
    const description = (descCol !== -1 ? r[descCol] ?? '' : '').trim()
    rows.push({ date, description, amountCents })
  }
  return { rows, skipped }
}

/**
 * Dedupe key per spec: date + amount + description (description normalized so
 * whitespace/case noise doesn't defeat it). Re-importing the same file is a
 * no-op; the import API drops incoming rows whose key already exists.
 */
export function dedupeKey(date: string, amountCents: number, description: string): string {
  const desc = description.toUpperCase().replace(/\s+/g, ' ').trim()
  return `${date}|${amountCents}|${desc}`
}
