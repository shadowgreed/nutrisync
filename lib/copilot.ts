import { buildWeeklyReport } from './weekly'
import type { WeeklyReport, WeeklyFoodRow, WeeklyActivityRow } from './weekly'
import { NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'
import { dietExpectedLow, dietLabel } from './diets'
import type { Diet, NutrientKey } from '@/types'

// ── Coach Copilot: deterministic client assessment ───────────────────────────
// This layer contains NO AI. It turns a member's recent logs into a structured
// attention level + signals. The LLM (M2) only phrases these already-computed
// facts into a draft message — it never recomputes nutrition or invents numbers.

export type AttentionLevel = 'on_track' | 'watch' | 'needs_attention'

export interface ClientSignal {
  code: 'logging_gap' | 'calorie_drift_over' | 'calorie_drift_under' | 'nutrient_gap' | 'strong_week' | 'diet_note'
  severity: 'info' | 'warn'
  label: string                  // human-readable, e.g. "3 days since last log"
  data: Record<string, unknown>  // structured, for the M2 draft prompt
}

export interface ClientStatus {
  attention: AttentionLevel
  signals: ClientSignal[]
  report: WeeklyReport
}

const DAY_MS = 24 * 60 * 60 * 1000
const DRIFT_PCT = 0.2  // off calorie target by >20% of the goal counts as drift
const LOW_PCT = 50     // a nutrient under this % of its daily target is "low"

/**
 * Assess one member from their last week of logs. `lastLoggedAt` is the most
 * recent food-log timestamp (null = never logged). `diet` (when known) lets us
 * acknowledge nutrients that naturally run low on that diet instead of flagging
 * them. Pure + deterministic.
 */
export function assessClient(opts: {
  foods: WeeklyFoodRow[]
  activities: WeeklyActivityRow[]
  calorieTarget: number
  lastLoggedAt: string | null
  diet?: Diet | null
  now?: Date
}): ClientStatus {
  const now = opts.now ?? new Date()
  const report = buildWeeklyReport({
    foods: opts.foods,
    activities: opts.activities,
    calorieTarget: opts.calorieTarget,
    now,
  })
  const signals: ClientSignal[] = []

  // ── Logging gap — the strongest churn signal ───────────────────────────────
  const daysSince = opts.lastLoggedAt
    ? Math.floor((now.getTime() - new Date(opts.lastLoggedAt).getTime()) / DAY_MS)
    : null
  if (daysSince === null) {
    signals.push({ code: 'logging_gap', severity: 'warn', label: 'Has not logged yet', data: { days: null } })
  } else if (daysSince >= 2) {
    signals.push({ code: 'logging_gap', severity: 'warn', label: `${daysSince} days since last log`, data: { days: daysSince } })
  }

  // ── Calorie drift > 20% of target ──────────────────────────────────────────
  if (report.daysLogged > 0 && report.calories.target > 0) {
    const pct = Math.abs(report.calories.deltaPerDay) / report.calories.target
    if (pct > DRIFT_PCT && report.calories.status === 'over') {
      signals.push({ code: 'calorie_drift_over', severity: 'warn', label: `${Math.abs(report.calories.deltaPerDay).toLocaleString()} kcal/day over target`, data: { delta: report.calories.deltaPerDay } })
    } else if (pct > DRIFT_PCT && report.calories.status === 'under') {
      signals.push({ code: 'calorie_drift_under', severity: 'warn', label: `${Math.abs(report.calories.deltaPerDay).toLocaleString()} kcal/day under target`, data: { delta: report.calories.deltaPerDay } })
    }
  }

  // ── Nutrients — diet-aware ─────────────────────────────────────────────────
  // Rank each tracked micronutrient by % of its daily target this week. A diet
  // can make some of these run low *by design* — those are acknowledged via a
  // neutral diet_note rather than flagged as a gap the coach should chase.
  if (report.daysLogged > 0) {
    const expected = new Set<NutrientKey>(dietExpectedLow(opts.diet))
    const perNutrient = NUTRIENT_KEYS.map(k => {
      const meta = NUTRIENT_META[k]
      const total = opts.foods.reduce((s, f) => s + (f.nutrient_totals?.[k] ?? 0), 0)
      const avg = total / report.daysLogged
      const pct = meta.target > 0 ? Math.round((avg / meta.target) * 100) : 0
      return { key: k, label: meta.label, emoji: meta.emoji, pct }
    })

    // Genuine gap: the worst nutrient that the diet does NOT explain.
    const worstUnexpected = perNutrient
      .filter(n => !expected.has(n.key))
      .sort((a, b) => a.pct - b.pct)[0]
    if (worstUnexpected && worstUnexpected.pct < LOW_PCT) {
      signals.push({
        code: 'nutrient_gap', severity: 'info',
        label: `${worstUnexpected.emoji} ${worstUnexpected.label} low (${worstUnexpected.pct}%)`,
        data: { nutrient: worstUnexpected.label, pct: worstUnexpected.pct },
      })
    }

    // Diet-expected nutrients that are low: acknowledge, don't alarm.
    const expectedLowNow = perNutrient.filter(n => expected.has(n.key) && n.pct < LOW_PCT)
    if (opts.diet && expectedLowNow.length > 0) {
      const names = expectedLowNow.map(n => n.label).slice(0, 3).join(', ')
      signals.push({
        code: 'diet_note', severity: 'info',
        label: `${dietLabel(opts.diet)}: ${names} naturally run lower`,
        data: { diet: opts.diet, nutrients: expectedLowNow.map(n => n.key) },
      })
    }
  }

  // ── Strong week → seeds a praise draft, not just fixes ─────────────────────
  if (report.daysLogged >= 4 && report.nutrients.accomplished && report.calories.accomplished) {
    signals.push({ code: 'strong_week', severity: 'info', label: 'Strong week — on calories & nutrients', data: {} })
  }

  // ── Roll up to an attention level ──────────────────────────────────────────
  // diet_note is neutral acknowledgement — it never raises the attention level.
  const hasWarn = signals.some(s => s.severity === 'warn')
  const softDip = daysSince === 1
  const hasInfoConcern = signals.some(s => s.code === 'nutrient_gap')
  const attention: AttentionLevel = hasWarn
    ? 'needs_attention'
    : (softDip || hasInfoConcern) ? 'watch' : 'on_track'

  return { attention, signals, report }
}
