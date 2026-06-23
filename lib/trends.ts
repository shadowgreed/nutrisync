import type { NutrientTotals, MacroTotals, NutrientKey } from '@/types'
import { emptyTotals, sumTotals, NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'
import { emptyMacros, sumMacros } from './macros'
import { userDayKey, todayKey, prevDayKey } from './day'

export interface DayTotal {
  date: string        // YYYY-MM-DD
  label: string       // e.g. "Mon 3"
  calories: number
  macros: MacroTotals
  nutrients: NutrientTotals
}

export interface LogLike {
  logged_at: string
  total_calories?: number | null
  macro_totals?: MacroTotals | null
  nutrient_totals?: NutrientTotals | null
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Build a zero-filled daily series for the last `rangeDays` days (oldest →
 *  today), bucketed in `timeZone` (the viewer's; defaults to runtime). */
export function buildDailySeries(logs: LogLike[], rangeDays: number, timeZone?: string): DayTotal[] {
  const dk = (ts: string) => (timeZone ? userDayKey(ts, timeZone) : dayKey(new Date(ts)))
  const byDay = new Map<string, { calories: number; macros: MacroTotals; nutrients: NutrientTotals }>()

  for (const log of logs) {
    const key = dk(log.logged_at)
    const cur = byDay.get(key) ?? { calories: 0, macros: emptyMacros(), nutrients: emptyTotals() }
    cur.calories += log.total_calories ?? 0
    cur.macros = sumMacros(cur.macros, (log.macro_totals as MacroTotals) ?? emptyMacros())
    cur.nutrients = sumTotals(cur.nutrients, (log.nutrient_totals as NutrientTotals) ?? emptyTotals())
    byDay.set(key, cur)
  }

  // Consecutive day keys, today back to (rangeDays-1) days ago, then oldest→today.
  const keys: string[] = []
  let k = timeZone ? todayKey(timeZone) : dayKey(new Date())
  for (let i = 0; i < rangeDays; i++) { keys.push(k); k = prevDayKey(k) }
  keys.reverse()

  return keys.map(key => {
    const entry = byDay.get(key)
    return {
      date: key,
      label: new Date(key + 'T12:00:00Z').toLocaleDateString([], { weekday: 'short', day: 'numeric', timeZone: 'UTC' }),
      calories: Math.round(entry?.calories ?? 0),
      macros: entry?.macros ?? emptyMacros(),
      nutrients: entry?.nutrients ?? emptyTotals(),
    }
  })
}

export interface MicroConsistency {
  key: NutrientKey
  label: string
  emoji: string
  daysHit: number       // days that met 100% of the daily target
  daysLogged: number    // days with any food logged
}

/** For each micronutrient, how many logged days hit its full daily target. */
export function microConsistency(series: DayTotal[]): MicroConsistency[] {
  const loggedDays = series.filter(d => d.calories > 0).length
  return NUTRIENT_KEYS.map(key => {
    const meta = NUTRIENT_META[key]
    const daysHit = series.filter(d => (d.nutrients[key] ?? 0) >= meta.target).length
    return { key, label: meta.label, emoji: meta.emoji, daysHit, daysLogged: loggedDays }
  }).sort((a, b) => a.daysHit - b.daysHit) // weakest first
}

export interface TrendSummary {
  avgCalories: number       // average over logged days
  loggedDays: number
  avgMacros: MacroTotals
}

export function summarize(series: DayTotal[]): TrendSummary {
  const logged = series.filter(d => d.calories > 0)
  const n = logged.length || 1
  const totalMacros = logged.reduce((acc, d) => sumMacros(acc, d.macros), emptyMacros())
  const avgMacros: MacroTotals = {
    protein_g: totalMacros.protein_g / n,
    carbs_g: totalMacros.carbs_g / n,
    fat_g: totalMacros.fat_g / n,
    fiber_g: totalMacros.fiber_g / n,
  }
  const avgCalories = Math.round(logged.reduce((s, d) => s + d.calories, 0) / n)
  return { avgCalories, loggedDays: logged.length, avgMacros }
}
