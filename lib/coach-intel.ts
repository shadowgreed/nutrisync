import { NUTRIENT_KEYS, NUTRIENT_META } from './nutrients'
import type { NutrientTotals, NutrientKey } from '@/types'

// ── Coach Intelligence: deterministic member analytics ───────────────────────
// Pure, LLM-free computation that turns a member's recent logs into compliance
// scores, behaviour patterns, a confidence rating and a templated natural-language
// summary. Mirrors the philosophy of lib/copilot.ts: the numbers and causes are
// computed in code (never invented), and only phrased into sentences here.

const DAY = 86400000
const ACTIVE_DAYS_GOAL = 4
const NUTRIENT_HIT_PCT = 90
const dayKey = (iso: string) => iso.slice(0, 10)

export type Severity = 'critical' | 'high' | 'watch' | 'good'

export interface IntelFood { logged_at: string; total_calories: number; protein_g: number; nutrient_totals: NutrientTotals; meal_type: string | null }
export interface IntelWater { logged_at: string; amount_ml: number }
export interface IntelActivity { logged_at: string; calories_burned: number }

export interface ComplianceMetric {
  key: 'calories' | 'protein' | 'hydration' | 'micronutrients' | 'activity'
  label: string
  pct: number                 // 0–100, clamped for the progress bar
  severity: Severity
  trend: 'up' | 'down' | 'flat' | null  // vs the prior 7 days
  deltaPts: number | null     // percentage-point change vs prior week
  detail: string              // e.g. "861 of 1,300 kcal/day"
}

export interface BehaviorRow {
  label: string
  logged: number
  of: number
  note: string                // "Consistent" | "Inconsistent" | "Frequently skipped" | …
  severity: Severity
}

export interface RecommendedAction {
  title: string
  impact: 'High' | 'Medium' | 'Low'
  outcome: string             // estimated outcome
  message: string             // a ready-to-send suggested message (coach can copy/edit)
}

export interface MemberIntel {
  hasData: boolean
  daysLogged: number
  compliance: ComplianceMetric[]
  behavior: BehaviorRow[]
  confidence: { pct: number; reasons: string[] }
  summary: { headline: string; causes: string[]; risk: string | null; recommendation: string | null }
  recommendedActions: RecommendedAction[]
}

// ── helpers ──────────────────────────────────────────────────────────────────
const within = (foods: { logged_at: string }[], fromMs: number, toMs: number) =>
  foods.filter(f => { const t = new Date(f.logged_at).getTime(); return t >= fromMs && t < toMs })

const loggedDays = (rows: { logged_at: string }[]) => new Set(rows.map(r => dayKey(r.logged_at))).size

function calsAvg(foods: IntelFood[]): number | null {
  const days = loggedDays(foods); if (!days) return null
  return foods.reduce((s, f) => s + (f.total_calories || 0), 0) / days
}
function proteinAvg(foods: IntelFood[]): number | null {
  const days = loggedDays(foods); if (!days) return null
  return foods.reduce((s, f) => s + (f.protein_g || 0), 0) / days
}
function waterAvg(water: IntelWater[]): number | null {
  const byDay = new Map<string, number>()
  for (const w of water) byDay.set(dayKey(w.logged_at), (byDay.get(dayKey(w.logged_at)) ?? 0) + (w.amount_ml || 0))
  if (byDay.size === 0) return null
  return [...byDay.values()].reduce((s, v) => s + v, 0) / byDay.size
}
function microsOnTrackPct(foods: IntelFood[]): number | null {
  const days = loggedDays(foods); if (!days) return null
  let onTrack = 0
  for (const k of NUTRIENT_KEYS) {
    const total = foods.reduce((s, f) => s + (f.nutrient_totals?.[k as NutrientKey] ?? 0), 0)
    const pct = NUTRIENT_META[k as NutrientKey].target > 0 ? (total / days) / NUTRIENT_META[k as NutrientKey].target * 100 : 0
    if (pct >= NUTRIENT_HIT_PCT) onTrack++
  }
  return (onTrack / NUTRIENT_KEYS.length) * 100
}
function activeDays(acts: IntelActivity[]): number { return loggedDays(acts) }

// "higher is better" severity bands
function bandHigher(pct: number): Severity {
  if (pct >= 90) return 'good'
  if (pct >= 60) return 'watch'
  if (pct >= 40) return 'high'
  return 'critical'
}
// calories: severity by absolute deviation from 100% of target
function bandCalories(pct: number): Severity {
  const dev = Math.abs(pct - 100)
  if (dev <= 10) return 'good'
  if (dev <= 25) return 'watch'
  if (dev <= 40) return 'high'
  return 'critical'
}

function trendOf(cur: number | null, prev: number | null): { trend: ComplianceMetric['trend']; deltaPts: number | null } {
  if (cur === null || prev === null) return { trend: null, deltaPts: null }
  const d = Math.round(cur - prev)
  return { trend: d > 2 ? 'up' : d < -2 ? 'down' : 'flat', deltaPts: d }
}

export function buildIntel(opts: {
  name: string
  goal: string | null
  foods: IntelFood[]        // last ~30 days
  water: IntelWater[]       // last ~30 days
  activities: IntelActivity[] // last ~30 days
  hasWeight: boolean
  calorieTarget: number
  proteinTarget: number
  waterTargetMl: number
  now?: number
}): MemberIntel {
  const now = opts.now ?? Date.now()
  const weekFrom = now - 7 * DAY
  const priorFrom = now - 14 * DAY

  const fw = within(opts.foods, weekFrom, now) as IntelFood[]
  const fp = within(opts.foods, priorFrom, weekFrom) as IntelFood[]
  const ww = within(opts.water, weekFrom, now) as IntelWater[]
  const wp = within(opts.water, priorFrom, weekFrom) as IntelWater[]
  const aw = within(opts.activities, weekFrom, now) as IntelActivity[]
  const ap = within(opts.activities, priorFrom, weekFrom) as IntelActivity[]

  const days = loggedDays(fw)
  const hasData = days > 0 || ww.length > 0 || aw.length > 0

  const calTarget = opts.calorieTarget || 2000
  const protTarget = opts.proteinTarget || 1
  const waterTarget = opts.waterTargetMl || 2500

  // ── Compliance ──────────────────────────────────────────────────────────────
  const calAvg = calsAvg(fw), calAvgP = calsAvg(fp)
  const protAvg = proteinAvg(fw), protAvgP = proteinAvg(fp)
  const watAvg = waterAvg(ww), watAvgP = waterAvg(wp)
  const micro = microsOnTrackPct(fw), microP = microsOnTrackPct(fp)
  const actPct = (activeDays(aw) / ACTIVE_DAYS_GOAL) * 100
  const actPctP = ap.length ? (activeDays(ap) / ACTIVE_DAYS_GOAL) * 100 : null

  const calPct = calAvg !== null ? (calAvg / calTarget) * 100 : null
  const protPct = protAvg !== null ? (protAvg / protTarget) * 100 : null
  const hydPct = watAvg !== null ? (watAvg / waterTarget) * 100 : null
  const calPctP = calAvgP !== null ? (calAvgP / calTarget) * 100 : null
  const protPctP = protAvgP !== null ? (protAvgP / protTarget) * 100 : null
  const hydPctP = watAvgP !== null ? (watAvgP / waterTarget) * 100 : null

  const clamp = (v: number | null) => v === null ? 0 : Math.max(0, Math.min(100, Math.round(v)))

  const compliance: ComplianceMetric[] = [
    {
      key: 'calories', label: 'Calories', pct: clamp(calPct),
      severity: calPct === null ? 'critical' : bandCalories(calPct),
      ...trendOf(calPct, calPctP),
      detail: calAvg !== null ? `${Math.round(calAvg).toLocaleString()} of ${calTarget.toLocaleString()} kcal/day` : 'No meals logged',
    },
    {
      key: 'protein', label: 'Protein', pct: clamp(protPct),
      severity: protPct === null ? 'critical' : bandHigher(protPct),
      ...trendOf(protPct, protPctP),
      detail: protAvg !== null ? `${Math.round(protAvg)} of ${Math.round(protTarget)} g/day` : 'No meals logged',
    },
    {
      key: 'hydration', label: 'Hydration', pct: clamp(hydPct),
      severity: hydPct === null ? 'critical' : bandHigher(hydPct),
      ...trendOf(hydPct, hydPctP),
      detail: watAvg !== null ? `${Math.round(watAvg / 29.5735)} of ${Math.round(waterTarget / 29.5735)} oz/day` : 'No water logged',
    },
    {
      key: 'micronutrients', label: 'Micronutrients', pct: clamp(micro),
      severity: micro === null ? 'critical' : bandHigher(micro),
      ...trendOf(micro, microP),
      detail: micro !== null ? `${Math.round(micro / 100 * NUTRIENT_KEYS.length)} of ${NUTRIENT_KEYS.length} on track` : 'No data',
    },
    {
      key: 'activity', label: 'Activity', pct: clamp(actPct),
      severity: bandHigher(actPct),
      ...trendOf(actPct, actPctP),
      detail: `${activeDays(aw)} of ${ACTIVE_DAYS_GOAL} active days`,
    },
  ]

  // ── Behaviour patterns (per-meal consistency over the week) ─────────────────
  const mealDays = (type: string) => new Set(fw.filter(f => f.meal_type === type).map(f => dayKey(f.logged_at))).size
  const behaviorNote = (n: number): { note: string; severity: Severity } =>
    n >= 6 ? { note: 'Consistent', severity: 'good' }
    : n >= 3 ? { note: 'Inconsistent', severity: 'watch' }
    : { note: 'Frequently skipped', severity: n === 0 ? 'critical' : 'high' }
  const waterDays = new Set(ww.map(w => dayKey(w.logged_at))).size

  const behavior: BehaviorRow[] = [
    ...(['breakfast', 'lunch', 'dinner'] as const).map(t => {
      const n = mealDays(t)
      return { label: t[0].toUpperCase() + t.slice(1), logged: n, of: 7, ...behaviorNote(n) }
    }),
    (() => { const b = behaviorNote(waterDays); return { label: 'Hydration', logged: waterDays, of: 7, note: b.note, severity: b.severity } })(),
  ]

  // ── Confidence (data completeness) ──────────────────────────────────────────
  const reasons: string[] = []
  let conf = Math.round((days / 7) * 70)
  reasons.push(`${days} of 7 days logged`)
  if (opts.hasWeight) { conf += 15; reasons.push('Weight data available') } else { reasons.push('No recent weight data') }
  if (waterDays > 0) { conf += 15; reasons.push('Hydration tracked') } else { reasons.push('Hydration not logged') }
  const confidence = { pct: Math.max(0, Math.min(100, conf)), reasons }

  // ── Templated natural-language summary ──────────────────────────────────────
  const first = opts.name.trim().split(/\s+/)[0] || 'This member'
  let headline = `Not enough recent data to summarise ${first}'s week.`
  const causes: string[] = []
  let risk: string | null = null
  let recommendation: string | null = null

  if (hasData && calAvg !== null) {
    const dev = Math.round(calAvg - calTarget)
    headline = dev < -50
      ? `${first} is averaging ${Math.abs(dev).toLocaleString()} kcal below target.`
      : dev > 50
        ? `${first} is averaging ${dev.toLocaleString()} kcal above target.`
        : `${first} is tracking close to their calorie target.`

    // Causes — only the ones the data supports.
    const breakfastDays = mealDays('breakfast')
    if (breakfastDays <= 4) causes.push(`Skipped breakfast ${7 - breakfastDays} of 7 days`)
    if (hydPct !== null && hydPctP !== null && hydPct < hydPctP - 10) {
      causes.push(`Water intake down ${Math.round(hydPctP - hydPct)}%`)
    } else if (hydPct !== null && hydPct < 60) {
      causes.push('Hydration below target')
    }
    const lowProteinDays = new Set(
      fw.filter(f => f.protein_g !== undefined).map(f => dayKey(f.logged_at)),
    )
    // protein below target on the days they logged
    const protByDay = new Map<string, number>()
    for (const f of fw) protByDay.set(dayKey(f.logged_at), (protByDay.get(dayKey(f.logged_at)) ?? 0) + (f.protein_g || 0))
    const underProtein = [...protByDay.values()].filter(p => p < protTarget * 0.8).length
    if (underProtein >= 2) causes.push(`Protein below target ${underProtein} of ${lowProteinDays.size || days} days`)

    // Risk
    if (dev < -300 && (opts.goal === 'lose_weight' || opts.goal === null)) risk = 'Accelerated / unsustainable weight loss'
    else if (dev < -300) risk = 'Under-fuelling relative to goal'
    else if (dev > 300 && opts.goal === 'lose_weight') risk = 'Calorie surplus is slowing weight-loss progress'
    else if ((protPct ?? 100) < 60) risk = 'Low protein may cost lean mass'

    // Recommendation — from the most pressing issue
    const worst = [...compliance].sort((a, b) => sevRank(b.severity) - sevRank(a.severity))[0]
    recommendation = worst
      ? recForMetric(worst.key, breakfastDays)
      : 'Keep the momentum going with consistent logging.'
  }

  const recommendedActions = buildRecommendedActions(first, compliance, mealDays('breakfast'), hasData)

  return {
    hasData,
    daysLogged: days,
    compliance,
    behavior,
    confidence,
    summary: { headline, causes, risk, recommendation },
    recommendedActions,
  }
}

// One-tap coaching plays, ranked by impact, derived from the worst areas. Each
// carries a ready-to-send message the coach can copy and edit.
function buildRecommendedActions(
  first: string, compliance: ComplianceMetric[], breakfastDays: number, hasData: boolean,
): RecommendedAction[] {
  if (!hasData) return []
  const by = (k: ComplianceMetric['key']) => compliance.find(c => c.key === k)
  const bad = (m?: ComplianceMetric) => !!m && (m.severity === 'critical' || m.severity === 'high')
  const out: RecommendedAction[] = []

  if (breakfastDays <= 4) {
    out.push({
      title: 'Breakfast consistency challenge', impact: 'High',
      outcome: 'Steadier energy and easier protein & calorie targets',
      message: `Hey ${first}, let's make breakfast a non-negotiable this week — even something quick. Want to try a 5-day breakfast streak together?`,
    })
  }
  if (bad(by('protein'))) {
    out.push({
      title: 'Boost daily protein', impact: 'High',
      outcome: 'Better satiety and lean-mass retention',
      message: `Hi ${first}, your protein has been running a bit low. Adding a protein source to each meal (eggs, Greek yogurt, chicken) would make a big difference — want some easy swaps?`,
    })
  }
  if (bad(by('hydration'))) {
    out.push({
      title: 'Hydration reset', impact: 'Medium',
      outcome: 'Better appetite control and recovery',
      message: `Hey ${first}, I noticed hydration dipped this week. Let's set a simple goal — a glass with each meal plus your bottle. How does that sound?`,
    })
  }
  if (bad(by('micronutrients'))) {
    out.push({
      title: 'Close micronutrient gaps', impact: 'Medium',
      outcome: 'Fewer deficiencies, better energy',
      message: `Hi ${first}, a few key nutrients came up short this week. A couple of targeted whole foods would close most of the gap — want me to suggest some?`,
    })
  }
  const cal = by('calories')
  if (cal && cal.severity === 'critical') {
    out.push({
      title: 'Stabilise daily intake', impact: 'High',
      outcome: 'More sustainable progress toward the goal',
      message: `Hey ${first}, your intake has been swinging quite a bit. Let's aim for more even meals day to day — what's been getting in the way?`,
    })
  }
  if (out.length === 0) {
    out.push({
      title: 'Send encouragement', impact: 'Low',
      outcome: 'Reinforces a strong week and keeps momentum',
      message: `${first}, awesome week — you've stayed consistent and on target. Really proud of the effort. Keep it rolling! 🎉`,
    })
  }
  const rank = { High: 0, Medium: 1, Low: 2 }
  return out.sort((a, b) => rank[a.impact] - rank[b.impact]).slice(0, 3)
}

function sevRank(s: Severity): number {
  return s === 'critical' ? 3 : s === 'high' ? 2 : s === 'watch' ? 1 : 0
}

function recForMetric(key: ComplianceMetric['key'], breakfastDays: number): string {
  switch (key) {
    case 'protein': return breakfastDays <= 4
      ? 'Add a protein-rich breakfast to lift protein and consistency.'
      : 'Add a higher-protein snack or meal to close the protein gap.'
    case 'hydration': return 'Set a hydration reminder and aim for steady water through the day.'
    case 'calories': return 'Stabilise daily intake closer to target with regular meals.'
    case 'micronutrients': return 'Add nutrient-dense whole foods to fill the biggest micronutrient gaps.'
    case 'activity': return 'Encourage a couple more active days this week — even short walks count.'
  }
}

export const SEVERITY_STYLE: Record<Severity, { bar: string; text: string; dot: string; label: string }> = {
  critical: { bar: 'bg-red-500',     text: 'text-red-400',     dot: 'bg-red-500',     label: 'Critical' },
  high:     { bar: 'bg-orange-500',  text: 'text-orange-400',  dot: 'bg-orange-500',  label: 'High' },
  watch:    { bar: 'bg-amber-400',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Watch' },
  good:     { bar: 'bg-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Good' },
}

// ── Daily trend series for the Trend Analysis charts ─────────────────────────
const ML_PER_OZ = 29.5735

export interface DailyPoint { date: string; label: string; calories: number; protein: number; waterOz: number; logged: boolean }
export interface WeightPoint { date: string; kg: number }
export interface TrendData {
  days: DailyPoint[]          // most-recent last, length = `span`
  weights: WeightPoint[]
  calorieTarget: number
  proteinTarget: number
  waterTargetOz: number
}

// ── Group / roster intelligence (Coach Dashboard triage) ─────────────────────
const SEV_ORDER: Severity[] = ['good', 'watch', 'high', 'critical']
function worse(a: Severity, b: Severity): Severity {
  return SEV_ORDER.indexOf(a) >= SEV_ORDER.indexOf(b) ? a : b
}
function sevRank2(s: Severity): number { return SEV_ORDER.indexOf(s) }

export interface MemberRollup {
  severity: Severity
  priority: number              // higher = more urgent (review-queue order)
  primaryIssue: string
  loggingPct: number
  caloriePct: number | null
  proteinPct: number | null
  hydrationPct: number | null
  daysSinceLog: number | null
}

/** Roll a member's full intel + recency into a single triage verdict. */
export function rollupMember(intel: MemberIntel, daysSinceLog: number | null): MemberRollup {
  const loggingPct = Math.round((intel.daysLogged / 7) * 100)
  const get = (k: ComplianceMetric['key']) => intel.compliance.find(c => c.key === k)
  const caloriePct = get('calories')?.pct ?? null
  const proteinPct = get('protein')?.pct ?? null
  const hydrationPct = get('hydration')?.pct ?? null

  const disengaged = daysSinceLog === null || daysSinceLog >= 4
  // Worst compliance area (excluding "good") becomes the headline issue.
  const ranked = [...intel.compliance].filter(c => c.severity !== 'good')
    .sort((a, b) => sevRank2(b.severity) - sevRank2(a.severity) || a.pct - b.pct)
  let severity: Severity = ranked.reduce<Severity>((acc, c) => worse(acc, c.severity), 'good')
  if (disengaged) severity = 'critical'
  else if (daysSinceLog !== null && daysSinceLog >= 2) severity = worse(severity, 'high')

  let primaryIssue: string
  if (daysSinceLog === null) primaryIssue = 'Has not logged yet'
  else if (daysSinceLog >= 2) primaryIssue = `${daysSinceLog} days since last log`
  else if (ranked.length > 0) primaryIssue = `${ranked[0].label} ${ranked[0].pct}%`
  else primaryIssue = 'On track'

  const priority = sevRank2(severity) * 1000 + (daysSinceLog ?? 7) * 25 + ranked.length * 10
  return { severity, priority, primaryIssue, loggingPct, caloriePct, proteinPct, hydrationPct, daysSinceLog }
}

export interface GroupIntel {
  counts: { critical: number; high: number; watch: number; healthy: number; total: number }
  healthScore: number
  healthLabel: string
  insights: string[]
  hydrationCompliancePct: number   // % of members hitting hydration this week
}

const calorieAdherence = (pct: number | null) => pct === null ? 0 : Math.max(0, 100 - Math.abs(pct - 100))

export function buildGroupIntel(rollups: MemberRollup[], opts: { checkinsSent: number }): GroupIntel {
  const total = rollups.length
  const counts = {
    critical: rollups.filter(r => r.severity === 'critical').length,
    high: rollups.filter(r => r.severity === 'high').length,
    watch: rollups.filter(r => r.severity === 'watch').length,
    healthy: rollups.filter(r => r.severity === 'good').length,
    total,
  }

  // Per-member health, then blended with coach engagement.
  const avg = (xs: number[]) => xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0
  const memberHealth = rollups.map(r =>
    0.35 * r.loggingPct
    + 0.25 * calorieAdherence(r.caloriePct)
    + 0.25 * Math.min(100, r.proteinPct ?? 0)
    + 0.15 * Math.min(100, r.hydrationPct ?? 0),
  )
  const engagementPct = total > 0 ? Math.min(100, (opts.checkinsSent / total) * 100) : 0
  const healthScore = total === 0 ? 0 : Math.round(0.85 * avg(memberHealth) + 0.15 * engagementPct)
  const healthLabel = healthScore >= 80 ? 'Thriving' : healthScore >= 60 ? 'Healthy' : healthScore >= 40 ? 'Needs work' : 'At risk'

  const hydrationCompliancePct = total > 0
    ? Math.round(rollups.filter(r => (r.hydrationPct ?? 0) >= 80).length / total * 100) : 0

  // ── Deterministic group insights ──────────────────────────────────────────
  const insights: string[] = []
  const underProtein = rollups.filter(r => r.proteinPct !== null && r.proteinPct < 70).length
  if (underProtein >= 2) insights.push(`${underProtein} members are consistently under their protein target.`)
  const underHydration = rollups.filter(r => (r.hydrationPct ?? 0) < 50 && r.loggingPct > 0).length
  if (underHydration >= 2) insights.push(`${underHydration} members are under-hydrated this week.`)
  const stopped = rollups.filter(r => r.daysSinceLog === null || (r.daysSinceLog ?? 0) >= 3).length
  if (stopped >= 1) insights.push(`${stopped} member${stopped === 1 ? ' has' : 's have'} stopped logging.`)
  if (counts.healthy >= 1) insights.push(`${counts.healthy} member${counts.healthy === 1 ? ' is' : 's are'} on track — a quick check-in keeps momentum.`)
  if (insights.length === 0) insights.push('Logging is steady across the group this week.')

  return { counts, healthScore, healthLabel, insights: insights.slice(0, 4), hydrationCompliancePct }
}

export function buildDailyTrends(opts: {
  foods: IntelFood[]
  water: IntelWater[]
  weights: WeightPoint[]
  calorieTarget: number
  proteinTarget: number
  waterTargetMl: number
  span?: number
  now?: number
}): TrendData {
  const span = opts.span ?? 30
  const now = opts.now ?? Date.now()
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (span - 1))

  const calByDay = new Map<string, number>()
  const protByDay = new Map<string, number>()
  const watByDay = new Map<string, number>()
  for (const f of opts.foods) {
    const k = dayKey(f.logged_at)
    calByDay.set(k, (calByDay.get(k) ?? 0) + (f.total_calories || 0))
    protByDay.set(k, (protByDay.get(k) ?? 0) + (f.protein_g || 0))
  }
  for (const w of opts.water) {
    const k = dayKey(w.logged_at)
    watByDay.set(k, (watByDay.get(k) ?? 0) + (w.amount_ml || 0))
  }

  const days: DailyPoint[] = []
  for (let i = 0; i < span; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const cal = Math.round(calByDay.get(key) ?? 0)
    days.push({
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calories: cal,
      protein: Math.round(protByDay.get(key) ?? 0),
      waterOz: Math.round((watByDay.get(key) ?? 0) / ML_PER_OZ),
      logged: cal > 0,
    })
  }

  return {
    days,
    weights: [...opts.weights].sort((a, b) => a.date.localeCompare(b.date)),
    calorieTarget: opts.calorieTarget || 2000,
    proteinTarget: Math.round(opts.proteinTarget || 0),
    waterTargetOz: Math.round((opts.waterTargetMl || 2500) / ML_PER_OZ),
  }
}
