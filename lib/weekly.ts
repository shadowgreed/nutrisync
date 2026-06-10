import { NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'
import type { NutrientKey, NutrientTotals } from '@/types'

// How many days a week we nudge people to be active for the activity slide.
export const ACTIVE_DAYS_GOAL = 4
// A nutrient counts as "hit" at >=90% of its daily target on average.
const NUTRIENT_HIT_PCT = 90

export interface WeeklyFoodRow { logged_at: string; total_calories: number; nutrient_totals: NutrientTotals }
export interface WeeklyActivityRow { logged_at: string; calories_burned: number }

export interface WeeklyReport {
  weekLabel: string
  daysLogged: number
  hasData: boolean
  calories: {
    avgPerDay: number
    target: number
    deltaPerDay: number          // signed: avg − target
    status: 'on' | 'under' | 'over'
    accomplished: boolean
    headline: string
    message: string
  }
  nutrients: {
    onTrack: number
    total: number
    best: { label: string; emoji: string; pct: number } | null
    worst: { label: string; emoji: string; pct: number } | null
    accomplished: boolean
    headline: string
    message: string
  }
  activities: {
    count: number
    activeDays: number
    goalDays: number
    caloriesBurned: number
    accomplished: boolean
    headline: string
    message: string
  }
}

const dayKey = (ts: string) => ts.slice(0, 10)

// localStorage key + the current week's id (most recent Sunday, local date) so the
// dashboard only auto-opens the report once per week.
export const WEEKLY_SEEN_KEY = 'ns_weekly_seen'
export function currentWeekKey(d = new Date()): string {
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - d.getDay())
  sunday.setHours(0, 0, 0, 0)
  const y = sunday.getFullYear()
  const m = String(sunday.getMonth() + 1).padStart(2, '0')
  const day = String(sunday.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function buildWeeklyReport(opts: {
  foods: WeeklyFoodRow[]
  activities: WeeklyActivityRow[]
  calorieTarget: number
  now?: Date
}): WeeklyReport {
  const { foods, activities } = opts
  const now = opts.now ?? new Date()
  const calorieTarget = opts.calorieTarget || 2000

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  const weekLabel = `${fmtDate(weekStart)} – ${fmtDate(now)}`

  const loggedDays = new Set(foods.map(f => dayKey(f.logged_at)))
  const daysLogged = loggedDays.size
  const hasData = daysLogged > 0 || activities.length > 0

  // ── Calories ───────────────────────────────────────────────────────────────
  const totalCals = foods.reduce((s, f) => s + (f.total_calories || 0), 0)
  const avgPerDay = daysLogged ? Math.round(totalCals / daysLogged) : 0
  const deltaPerDay = avgPerDay - calorieTarget
  const withinPct = calorieTarget > 0 ? Math.abs(deltaPerDay) / calorieTarget : 1
  const calStatus: 'on' | 'under' | 'over' = !daysLogged ? 'on' : deltaPerDay > 0 ? 'over' : deltaPerDay < 0 ? 'under' : 'on'
  const calAccomplished = daysLogged > 0 && withinPct <= 0.1
  const calHeadline = !daysLogged
    ? 'No meals logged this week'
    : `${avgPerDay.toLocaleString()} kcal/day avg`
  const calMessage = !daysLogged
    ? 'Log meals next week to see your calorie trend.'
    : calAccomplished
      ? `Right on target — within ${Math.round(withinPct * 100)}% of your ${calorieTarget.toLocaleString()} kcal goal. 🎉`
      : calStatus === 'over'
        ? `You averaged ${Math.abs(deltaPerDay).toLocaleString()} kcal/day over your ${calorieTarget.toLocaleString()} goal. Small swaps next week can close the gap. 💪`
        : `You averaged ${Math.abs(deltaPerDay).toLocaleString()} kcal/day under your ${calorieTarget.toLocaleString()} goal. Fuel up so you hit your targets. 💪`

  // ── Nutrients ──────────────────────────────────────────────────────────────
  const perNutrient = NUTRIENT_KEYS.map(k => {
    const total = foods.reduce((s, f) => s + (f.nutrient_totals?.[k as NutrientKey] ?? 0), 0)
    const avg = daysLogged ? total / daysLogged : 0
    const target = NUTRIENT_META[k as NutrientKey].target
    const pct = target > 0 ? Math.round((avg / target) * 100) : 0
    return { label: NUTRIENT_META[k as NutrientKey].label, emoji: NUTRIENT_META[k as NutrientKey].emoji, pct }
  })
  const onTrack = perNutrient.filter(n => n.pct >= NUTRIENT_HIT_PCT).length
  const total = perNutrient.length
  const sorted = [...perNutrient].sort((a, b) => b.pct - a.pct)
  const best = daysLogged ? sorted[0] ?? null : null
  const worst = daysLogged ? sorted[sorted.length - 1] ?? null : null
  const nutAccomplished = daysLogged > 0 && onTrack >= Math.ceil(total * 0.7)
  const nutHeadline = !daysLogged ? 'No nutrient data yet' : `${onTrack} of ${total} nutrients on track`
  const nutMessage = !daysLogged
    ? 'Log meals to track your vitamins & minerals.'
    : nutAccomplished
      ? `Strong week — ${best ? `${best.emoji} ${best.label} led the way at ${best.pct}% of target.` : 'great coverage across the board.'} 🎉`
      : `${worst ? `${worst.emoji} ${worst.label} came up short at ${worst.pct}% of target — a focus for next week.` : 'A few nutrients came up short.'} 💪`

  // ── Activities ─────────────────────────────────────────────────────────────
  const activeDays = new Set(activities.map(a => dayKey(a.logged_at))).size
  const count = activities.length
  const burned = Math.round(activities.reduce((s, a) => s + (a.calories_burned || 0), 0))
  const actAccomplished = activeDays >= ACTIVE_DAYS_GOAL
  const actHeadline = count === 0 ? 'No workouts logged' : `${count} workout${count === 1 ? '' : 's'} · ${burned.toLocaleString()} kcal burned`
  const actMessage = count === 0
    ? `Aim for ${ACTIVE_DAYS_GOAL} active days next week — even a short walk counts. 💪`
    : actAccomplished
      ? `You hit ${activeDays} active days — goal of ${ACTIVE_DAYS_GOAL} smashed! 🎉`
      : `${activeDays} of ${ACTIVE_DAYS_GOAL} active days. ${ACTIVE_DAYS_GOAL - activeDays} more next week to hit your goal. 💪`

  return {
    weekLabel,
    daysLogged,
    hasData,
    calories: { avgPerDay, target: calorieTarget, deltaPerDay, status: calStatus, accomplished: calAccomplished, headline: calHeadline, message: calMessage },
    nutrients: { onTrack, total, best, worst, accomplished: nutAccomplished, headline: nutHeadline, message: nutMessage },
    activities: { count, activeDays, goalDays: ACTIVE_DAYS_GOAL, caloriesBurned: burned, accomplished: actAccomplished, headline: actHeadline, message: actMessage },
  }
}
