/**
 * Money = integer cents everywhere in application code. The database stores
 * NUMERIC(12,2); supabase-js returns numeric columns as strings, and these
 * helpers convert at that boundary with string math — no parseFloat on
 * currency anywhere.
 */

/**
 * Parse a human/CSV/db currency string to integer cents.
 * Accepts "1234.56", "$1,234.56", "-12.34", "(12.34)" (accounting negative),
 * "12", "12.5". Returns null when the value isn't a recognizable amount.
 */
export function parseCents(value: unknown): number | null {
  if (typeof value === 'number') {
    // Trusted numeric input (e.g. already-validated JSON). Round to cents.
    return Number.isFinite(value) ? Math.round(value * 100) : null
  }
  if (typeof value !== 'string') return null
  let s = value.trim()
  if (!s) return null

  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  s = s.replace(/[$,\s]/g, '')
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1) }
  else if (s.startsWith('+')) s = s.slice(1)

  if (!/^\d*(\.\d*)?$/.test(s) || s === '' || s === '.') return null

  const [wholeRaw = '', fracRaw = ''] = s.split('.')
  const whole = wholeRaw === '' ? 0 : Number(wholeRaw)
  // Pad/truncate the fraction to exactly 2 digits, rounding on the 3rd.
  const frac2 = (fracRaw + '00').slice(0, 2)
  const roundUp = fracRaw.length > 2 && Number(fracRaw[2]) >= 5 ? 1 : 0
  const cents = whole * 100 + Number(frac2) + roundUp
  if (!Number.isSafeInteger(cents)) return null
  return negative ? -cents : cents
}

/** Format cents as "$1,234.56" (sign in front of the $). */
export function formatCents(cents: number, opts: { sign?: boolean } = {}): string {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  const whole = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  const body = `$${whole.toLocaleString('en-US')}.${frac}`
  if (negative) return `-${body}`
  return opts.sign ? `+${body}` : body
}

/** Format cents as whole dollars ("$1,235") for dense displays. */
export function formatDollars(cents: number): string {
  const negative = cents < 0
  const whole = Math.round(Math.abs(cents) / 100)
  return `${negative ? '-' : ''}$${whole.toLocaleString('en-US')}`
}

/** Cents → "1234.56" string for writing to a NUMERIC(12,2) column. */
export function centsToNumericString(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(Math.round(cents))
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** Database numeric (string | number | null) → cents, defaulting to 0. */
export function dbToCents(value: unknown): number {
  return parseCents(value ?? null) ?? 0
}
