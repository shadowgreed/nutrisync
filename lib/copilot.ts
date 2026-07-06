import { buildWeeklyReport } from './weekly'
import type { WeeklyReport, WeeklyFoodRow, WeeklyActivityRow } from './weekly'
import { NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'
import { dietExpectedLow, dietLabel } from './diets'
import type { Diet, NutrientKey } from '@/types'

// Localized strings for the signal labels this module generates — both the
// coach-dashboard display AND the text fed into the Copilot draft prompt (so a
// Spanish-locale coach sees Spanish signal chips and gets Spanish-aware drafts).
// Defaults to English so assessClient/assessMember stay usable without wiring
// i18n. Never changes the underlying facts/numbers — only how they're phrased.
export interface CopilotStrings {
  notLoggedYet: string
  daysSinceLog: (n: number) => string
  overTarget: (kcal: string) => string
  underTarget: (kcal: string) => string
  nutrientLow: (emoji: string, label: string, pct: number) => string
  dietNote: (dietLbl: string, names: string) => string
  strongWeek: string
  nutrientLabel: (key: NutrientKey) => string
  dietLabel: (diet: Diet | null | undefined) => string
}

export const EN_COPILOT_STRINGS: CopilotStrings = {
  notLoggedYet: 'Has not logged yet',
  daysSinceLog: (n) => `${n} days since last log`,
  overTarget: (kcal) => `${kcal} kcal/day over target`,
  underTarget: (kcal) => `${kcal} kcal/day under target`,
  nutrientLow: (emoji, label, pct) => `${emoji} ${label} low (${pct}%)`,
  dietNote: (dietLbl, names) => `${dietLbl}: ${names} naturally run lower`,
  strongWeek: 'Strong week — on calories & nutrients',
  nutrientLabel: (key) => NUTRIENT_META[key].label,
  dietLabel: (diet) => dietLabel(diet),
}

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
  timeZone?: string
  strings?: CopilotStrings
}): ClientStatus {
  const S = opts.strings ?? EN_COPILOT_STRINGS
  const now = opts.now ?? new Date()
  const report = buildWeeklyReport({
    foods: opts.foods,
    activities: opts.activities,
    calorieTarget: opts.calorieTarget,
    now,
    timeZone: opts.timeZone,
  })
  const signals: ClientSignal[] = []

  // ── Logging gap — the strongest churn signal ───────────────────────────────
  const daysSince = opts.lastLoggedAt
    ? Math.floor((now.getTime() - new Date(opts.lastLoggedAt).getTime()) / DAY_MS)
    : null
  if (daysSince === null) {
    signals.push({ code: 'logging_gap', severity: 'warn', label: S.notLoggedYet, data: { days: null } })
  } else if (daysSince >= 2) {
    signals.push({ code: 'logging_gap', severity: 'warn', label: S.daysSinceLog(daysSince), data: { days: daysSince } })
  }

  // ── Calorie drift > 20% of target ──────────────────────────────────────────
  if (report.daysLogged > 0 && report.calories.target > 0) {
    const pct = Math.abs(report.calories.deltaPerDay) / report.calories.target
    if (pct > DRIFT_PCT && report.calories.status === 'over') {
      signals.push({ code: 'calorie_drift_over', severity: 'warn', label: S.overTarget(Math.abs(report.calories.deltaPerDay).toLocaleString()), data: { delta: report.calories.deltaPerDay } })
    } else if (pct > DRIFT_PCT && report.calories.status === 'under') {
      signals.push({ code: 'calorie_drift_under', severity: 'warn', label: S.underTarget(Math.abs(report.calories.deltaPerDay).toLocaleString()), data: { delta: report.calories.deltaPerDay } })
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
      return { key: k, label: S.nutrientLabel(k), emoji: meta.emoji, pct }
    })

    // Genuine gap: the worst nutrient that the diet does NOT explain.
    const worstUnexpected = perNutrient
      .filter(n => !expected.has(n.key))
      .sort((a, b) => a.pct - b.pct)[0]
    if (worstUnexpected && worstUnexpected.pct < LOW_PCT) {
      signals.push({
        code: 'nutrient_gap', severity: 'info',
        label: S.nutrientLow(worstUnexpected.emoji, worstUnexpected.label, worstUnexpected.pct),
        data: { nutrient: worstUnexpected.label, key: worstUnexpected.key, pct: worstUnexpected.pct },
      })
    }

    // Diet-expected nutrients that are low: acknowledge, don't alarm.
    const expectedLowNow = perNutrient.filter(n => expected.has(n.key) && n.pct < LOW_PCT)
    if (opts.diet && expectedLowNow.length > 0) {
      const names = expectedLowNow.map(n => n.label).slice(0, 3).join(', ')
      signals.push({
        code: 'diet_note', severity: 'info',
        label: S.dietNote(S.dietLabel(opts.diet), names),
        data: { diet: opts.diet, nutrients: expectedLowNow.map(n => n.key) },
      })
    }
  }

  // ── Strong week → seeds a praise draft, not just fixes ─────────────────────
  if (report.daysLogged >= 4 && report.nutrients.accomplished && report.calories.accomplished) {
    signals.push({ code: 'strong_week', severity: 'info', label: S.strongWeek, data: {} })
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
