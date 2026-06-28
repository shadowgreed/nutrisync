// ── Canonical day-key helpers (Phase 8: timezone standardization) ────────────
// A "day" must mean the same thing everywhere: the calendar date in the USER's
// timezone, not the server's (UTC on Vercel) and not whatever the runtime
// happens to be. Mixing UTC `.slice(0,10)` and runtime-local date math produced
// off-by-one streaks/reports near midnight. Always derive a day key from an
// explicit IANA timezone via Intl, which behaves identically on server & client.

export const DEFAULT_TZ = 'America/New_York'

// Resolve a stored/optional tz to a valid IANA zone, falling back to DEFAULT_TZ.
export function resolveTimeZone(tz?: string | null): string {
  if (tz) {
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: tz })
      return tz
    } catch {
      /* invalid stored value — fall through */
    }
  }
  return DEFAULT_TZ
}

// The browser's IANA timezone (client only; returns null if unavailable).
export function getBrowserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

// YYYY-MM-DD calendar date of `ts` in `timeZone`. en-CA + 2-digit parts yields
// exactly "2026-06-23".
export function userDayKey(ts: string | number | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ts))
}

// Today's day key in `timeZone`.
export function todayKey(timeZone: string, now: Date = new Date()): string {
  return userDayKey(now, timeZone)
}

// The calendar day before a YYYY-MM-DD key. Parsed at noon UTC so DST shifts and
// month/year rollovers never move the date; the result is a pure date string and
// is timezone-agnostic (the key is already in the user's zone).
export function prevDayKey(key: string): string {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// The calendar day after a YYYY-MM-DD key (same approach).
export function nextDayKey(key: string): string {
  const d = new Date(key + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Day of week (0 = Sunday … 6 = Saturday) for a YYYY-MM-DD key. Parsed at noon
// UTC so the weekday never shifts.
export function dayOfWeek(key: string): number {
  return new Date(key + 'T12:00:00Z').getUTCDay()
}

// True when `now` falls on a Sunday in `timeZone`. This is the canonical
// Sunday check — the weekly review is a Sunday-only ritual, and "Sunday" must
// mean Sunday in the USER's zone, not UTC or the server's.
export function isSunday(timeZone: string, now: Date = new Date()): boolean {
  return dayOfWeek(userDayKey(now, timeZone)) === 0
}
