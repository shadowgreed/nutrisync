// Water is stored canonically in millilitres in the DB, but US users think in
// fluid ounces and bottle sizes. These helpers convert for display/input.

import { userDayKey } from './day'

export const ML_PER_OZ = 29.5735

export function mlToOz(ml: number): number {
  return Math.round(ml / ML_PER_OZ)
}

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ)
}

export function formatOz(ml: number): string {
  return `${mlToOz(ml)} oz`
}

// Common US bottle/glass sizes (oz) and daily targets (oz). A custom input covers
// anything outside these presets.
export const BOTTLE_OZ_PRESETS = [16, 24, 32]
export const TARGET_OZ_PRESETS = [32, 40, 60, 64]

// ── Weekly hydration ─────────────────────────────────────────────────────────
// Mirrors the calorie/activity weekly summaries: how much water per day over the
// last 7 days, and how many days hit the daily target. Used on the profile (own
// data) and the coach dashboard (a client's data).

export interface WeeklyWaterRow { logged_at: string; amount_ml: number }

export interface WaterWeek {
  avgMl: number      // average per LOGGED day (matches the calorie averaging)
  targetMl: number
  daysHit: number    // days that reached the daily target
  daysLogged: number // days with any water logged
  goalDays: number   // 7
}

/**
 * Total ml logged on one calendar day (`dayKey`, YYYY-MM-DD) in `timeZone`.
 * The single source of truth for "did the user hit today's water goal" — used
 * by both the widget snapshot (lib/widget) and the water-goal milestone
 * (/api/log-water) so the two can never disagree.
 */
export function totalMlOnDay(
  rows: { logged_at: string; amount_ml?: number | null }[],
  timeZone: string,
  dayKey: string,
): number {
  return rows
    .filter(r => userDayKey(r.logged_at, timeZone) === dayKey)
    .reduce((s, r) => s + (Number(r.amount_ml) || 0), 0)
}

/** Sum water (ml) per day for the last 7 days, bucketed in `timeZone` (the
 *  user's; defaults to runtime when unset). */
export function waterByDay(rows: WeeklyWaterRow[], now = new Date(), timeZone?: string): Map<string, number> {
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const dk = (iso: string) => (timeZone ? userDayKey(iso, timeZone) : iso.slice(0, 10))
  const byDay = new Map<string, number>()
  for (const r of rows) {
    if (new Date(r.logged_at).getTime() < sevenDaysAgo) continue
    const key = dk(r.logged_at)
    byDay.set(key, (byDay.get(key) ?? 0) + (r.amount_ml || 0))
  }
  return byDay
}

export function buildWaterWeek(rows: WeeklyWaterRow[], targetMl: number, now = new Date(), timeZone?: string): WaterWeek {
  const target = targetMl > 0 ? targetMl : 2500
  const totals = [...waterByDay(rows, now, timeZone).values()]
  const daysLogged = totals.length
  const total = totals.reduce((s, v) => s + v, 0)
  return {
    avgMl: daysLogged ? Math.round(total / daysLogged) : 0,
    targetMl: target,
    daysHit: totals.filter(v => v >= target).length,
    daysLogged,
    goalDays: 7,
  }
}
