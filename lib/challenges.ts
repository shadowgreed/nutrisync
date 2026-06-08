import type { NutrientTotals, MacroTotals } from '@/types'
import { NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'

export type ChallengeMetric = 'log_days' | 'protein_days' | 'micro_days'

export const PROTEIN_DAY_THRESHOLD = 100   // grams
export const MICRO_DAY_MIN_HITS = 5        // hit ≥5 of 10 micros at 100%

export const CHALLENGE_METRICS: Record<ChallengeMetric, {
  label: string
  emoji: string
  description: string
  unit: string          // what a "success" counts toward
}> = {
  log_days: {
    label: 'Logging streak',
    emoji: '📋',
    description: 'Log at least one meal each day',
    unit: 'days logged',
  },
  protein_days: {
    label: 'Protein push',
    emoji: '🥩',
    description: `Hit ${PROTEIN_DAY_THRESHOLD}g+ protein in a day`,
    unit: 'protein days',
  },
  micro_days: {
    label: 'Micronutrient master',
    emoji: '🌈',
    description: `Hit ${MICRO_DAY_MIN_HITS}+ micronutrient targets in a day`,
    unit: 'nutrient days',
  },
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

/**
 * Count a member's successful days for a challenge metric within [startDate, endDate]
 * (both YYYY-MM-DD, inclusive). Progress is derived purely from food logs.
 */
export function computeMemberProgress(
  logs: LogLike[],
  metric: ChallengeMetric,
  startDate: string,
  endDate: string,
): number {
  const byDay = new Map<string, { protein: number; nutrients: NutrientTotals }>()

  for (const log of logs) {
    const key = dayKey(new Date(log.logged_at))
    if (key < startDate || key > endDate) continue // ISO date strings compare correctly
    const cur = byDay.get(key) ?? { protein: 0, nutrients: {} as NutrientTotals }
    cur.protein += log.macro_totals?.protein_g ?? 0
    for (const k of NUTRIENT_KEYS) {
      cur.nutrients[k] = (cur.nutrients[k] ?? 0) + (log.nutrient_totals?.[k] ?? 0)
    }
    byDay.set(key, cur)
  }

  let count = 0
  for (const day of byDay.values()) {
    if (metric === 'log_days') {
      count++
    } else if (metric === 'protein_days') {
      if (day.protein >= PROTEIN_DAY_THRESHOLD) count++
    } else if (metric === 'micro_days') {
      const hits = NUTRIENT_KEYS.filter(k => (day.nutrients[k] ?? 0) >= NUTRIENT_META[k].target).length
      if (hits >= MICRO_DAY_MIN_HITS) count++
    }
  }
  return count
}

export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export function challengeStatus(startDate: string, endDate: string, today = dayKey(new Date())): ChallengeStatus {
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'ended'
  return 'active'
}

/** Whole days remaining (0 if ended). */
export function daysRemaining(endDate: string, today = dayKey(new Date())): number {
  const end = new Date(endDate + 'T00:00:00')
  const now = new Date(today + 'T00:00:00')
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000)
  return Math.max(0, diff)
}

/** Suggested default goal for a metric over a window of `lengthDays`. */
export function suggestedGoal(metric: ChallengeMetric, lengthDays: number): number {
  if (metric === 'log_days') return lengthDays
  return Math.max(1, Math.round(lengthDays * 0.7))
}
