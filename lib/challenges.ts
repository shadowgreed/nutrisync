import type { NutrientTotals, MacroTotals } from '@/types'
import { NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'
import { userDayKey } from './day'

export type ChallengeMetric =
  | 'log_days'
  | 'protein_days'
  | 'micro_days'
  | 'active_days'
  | 'water_days'

export type ChallengeCategory = 'nutrition' | 'activity' | 'hydration'

export const PROTEIN_DAY_THRESHOLD = 100   // grams
export const MICRO_DAY_MIN_HITS = 5        // hit ≥5 of 10 micros at 100%
export const WATER_DAY_THRESHOLD_ML = 2000 // a day "counts" at ≥2 L logged

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  nutrition: 'Nutrition',
  activity: 'Activity',
  hydration: 'Hydration',
}

export const CHALLENGE_METRICS: Record<ChallengeMetric, {
  label: string
  emoji: string
  description: string      // exactly what counts as a successful day
  unit: string             // what a "success" counts toward, plural noun
  category: ChallengeCategory
  reward: { emoji: string; label: string }   // badge unlocked on completion
}> = {
  log_days: {
    label: 'Logging Streak',
    emoji: '🔥',
    description: 'Log at least one meal',
    unit: 'daily logs',
    category: 'nutrition',
    reward: { emoji: '🏆', label: 'Logging Streak Badge' },
  },
  protein_days: {
    label: 'Protein Push',
    emoji: '🥩',
    description: `Hit ${PROTEIN_DAY_THRESHOLD}g+ protein`,
    unit: 'protein days',
    category: 'nutrition',
    reward: { emoji: '🏅', label: 'Protein Champion Badge' },
  },
  micro_days: {
    label: 'Micronutrient Master',
    emoji: '🌈',
    description: `Hit ${MICRO_DAY_MIN_HITS}+ micronutrient targets`,
    unit: 'nutrient days',
    category: 'nutrition',
    reward: { emoji: '🥗', label: 'Nutrient Master Badge' },
  },
  active_days: {
    label: 'Active Days',
    emoji: '🏃',
    description: 'Log a workout or activity',
    unit: 'active days',
    category: 'activity',
    reward: { emoji: '💪', label: 'Movement Badge' },
  },
  water_days: {
    label: 'Water Challenge',
    emoji: '💧',
    description: `Drink ${(WATER_DAY_THRESHOLD_ML / 1000).toFixed(0)} L+ of water`,
    unit: 'hydration days',
    category: 'hydration',
    reward: { emoji: '🌊', label: 'Hydration Hero Badge' },
  },
}

export const CHALLENGE_CATEGORIES: ChallengeCategory[] = ['nutrition', 'activity', 'hydration']

export interface LogLike {
  logged_at: string
  total_calories?: number | null
  macro_totals?: MacroTotals | null
  nutrient_totals?: NutrientTotals | null
}

// Per-member inputs needed to evaluate any metric. Activity/water day-keys are
// pre-bucketed by the caller (local-date keys) so this stays metric-agnostic.
export interface ProgressInput {
  food: LogLike[]
  activityDayKeys: Set<string>
  waterMlByDayKey: Map<string, number>
}

export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function prevDayKey(key: string): string {
  const d = new Date(key + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return localDayKey(d)
}

/**
 * The set of successful day-keys (YYYY-MM-DD, local) a member earned for a
 * metric within [startDate, endDate] inclusive. Progress is `.size`.
 */
export function memberSuccessDays(
  metric: ChallengeMetric,
  startDate: string,
  endDate: string,
  input: ProgressInput,
  timeZone?: string,
): Set<string> {
  const out = new Set<string>()
  const inWindow = (k: string) => k >= startDate && k <= endDate // ISO date strings compare correctly

  if (metric === 'active_days') {
    for (const k of input.activityDayKeys) if (inWindow(k)) out.add(k)
    return out
  }
  if (metric === 'water_days') {
    for (const [k, ml] of input.waterMlByDayKey) if (inWindow(k) && ml >= WATER_DAY_THRESHOLD_ML) out.add(k)
    return out
  }

  // Food-based metrics: aggregate protein + nutrients per day, then test.
  // Day buckets use the member's timezone (defaults to runtime when unset).
  const dayOf = timeZone ? (ts: string) => userDayKey(ts, timeZone) : (ts: string) => localDayKey(new Date(ts))
  const byDay = new Map<string, { protein: number; nutrients: NutrientTotals }>()
  for (const log of input.food) {
    const key = dayOf(log.logged_at)
    if (!inWindow(key)) continue
    const cur = byDay.get(key) ?? { protein: 0, nutrients: {} as NutrientTotals }
    cur.protein += log.macro_totals?.protein_g ?? 0
    for (const k of NUTRIENT_KEYS) {
      cur.nutrients[k] = (cur.nutrients[k] ?? 0) + (log.nutrient_totals?.[k] ?? 0)
    }
    byDay.set(key, cur)
  }
  for (const [key, day] of byDay) {
    if (metric === 'log_days') out.add(key)
    else if (metric === 'protein_days') { if (day.protein >= PROTEIN_DAY_THRESHOLD) out.add(key) }
    else if (metric === 'micro_days') {
      const hits = NUTRIENT_KEYS.filter(k => (day.nutrients[k] ?? 0) >= NUTRIENT_META[k].target).length
      if (hits >= MICRO_DAY_MIN_HITS) out.add(key)
    }
  }
  return out
}

/**
 * Consecutive successful days ending today (with a one-day grace before today is
 * earned), bounded by the challenge window. After the challenge ends, counts the
 * run ending on the final day.
 */
export function challengeStreak(success: Set<string>, startDate: string, endDate: string, today = localDayKey(new Date())): number {
  let cursor = today > endDate ? endDate : today
  if (cursor < startDate) return 0
  if (!success.has(cursor)) {
    cursor = prevDayKey(cursor)
    if (cursor < startDate || !success.has(cursor)) return 0
  }
  let n = 0
  while (cursor >= startDate && success.has(cursor)) {
    n++
    cursor = prevDayKey(cursor)
  }
  return n
}

export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export function challengeStatus(startDate: string, endDate: string, today = localDayKey(new Date())): ChallengeStatus {
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'ended'
  return 'active'
}

/** 1-based day index within the challenge (clamped to [1, total]). */
export function dayIndex(startDate: string, endDate: string, today = localDayKey(new Date())): number {
  const total = totalDays(startDate, endDate)
  const start = new Date(startDate + 'T00:00:00').getTime()
  const now = new Date((today < startDate ? startDate : today > endDate ? endDate : today) + 'T00:00:00').getTime()
  const idx = Math.round((now - start) / 86400000) + 1
  return Math.min(total, Math.max(1, idx))
}

export function totalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime()
  const end = new Date(endDate + 'T00:00:00').getTime()
  return Math.max(1, Math.round((end - start) / 86400000) + 1)
}

/** Whole days remaining (0 if ended). */
export function daysRemaining(endDate: string, today = localDayKey(new Date())): number {
  const end = new Date(endDate + 'T00:00:00')
  const now = new Date(today + 'T00:00:00')
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000)
  return Math.max(0, diff)
}

/**
 * Is the member keeping pace? Compares progress against the goal pro-rated by how
 * much of the challenge has elapsed. Always true once the goal is reached.
 */
export function isOnTrack(progress: number, goal: number, startDate: string, endDate: string, today = localDayKey(new Date())): boolean {
  if (progress >= goal) return true
  // Pace against fully-completed days (dayIndex − 1) so the current day in
  // progress never counts you as "behind" before you've had a chance to log.
  const completed = Math.max(0, dayIndex(startDate, endDate, today) - 1)
  const expected = goal * (completed / totalDays(startDate, endDate))
  return progress >= expected
}

/** Suggested default goal for a metric over a window of `lengthDays`. */
export function suggestedGoal(metric: ChallengeMetric, lengthDays: number): number {
  if (metric === 'log_days' || metric === 'active_days') return lengthDays
  return Math.max(1, Math.round(lengthDays * 0.7))
}
