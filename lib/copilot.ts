import { buildWeeklyReport } from './weekly'
import type { WeeklyReport, WeeklyFoodRow, WeeklyActivityRow } from './weekly'

// ── Coach Copilot: deterministic client assessment ───────────────────────────
// This layer contains NO AI. It turns a member's recent logs into a structured
// attention level + signals. The LLM (M2) only phrases these already-computed
// facts into a draft message — it never recomputes nutrition or invents numbers.

export type AttentionLevel = 'on_track' | 'watch' | 'needs_attention'

export interface ClientSignal {
  code: 'logging_gap' | 'calorie_drift_over' | 'calorie_drift_under' | 'nutrient_gap' | 'strong_week'
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

/**
 * Assess one member from their last week of logs. `lastLoggedAt` is the most
 * recent food-log timestamp (null = never logged). Pure + deterministic.
 */
export function assessClient(opts: {
  foods: WeeklyFoodRow[]
  activities: WeeklyActivityRow[]
  calorieTarget: number
  lastLoggedAt: string | null
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

  // ── Biggest nutrient gap (informational) ───────────────────────────────────
  if (report.daysLogged > 0 && report.nutrients.worst && report.nutrients.worst.pct < 50) {
    signals.push({
      code: 'nutrient_gap', severity: 'info',
      label: `${report.nutrients.worst.emoji} ${report.nutrients.worst.label} low (${report.nutrients.worst.pct}%)`,
      data: { nutrient: report.nutrients.worst.label, pct: report.nutrients.worst.pct },
    })
  }

  // ── Strong week → seeds a praise draft, not just fixes ─────────────────────
  if (report.daysLogged >= 4 && report.nutrients.accomplished && report.calories.accomplished) {
    signals.push({ code: 'strong_week', severity: 'info', label: 'Strong week — on calories & nutrients', data: {} })
  }

  // ── Roll up to an attention level ──────────────────────────────────────────
  const hasWarn = signals.some(s => s.severity === 'warn')
  const softDip = daysSince === 1
  const hasInfoConcern = signals.some(s => s.code === 'nutrient_gap')
  const attention: AttentionLevel = hasWarn
    ? 'needs_attention'
    : (softDip || hasInfoConcern) ? 'watch' : 'on_track'

  return { attention, signals, report }
}
