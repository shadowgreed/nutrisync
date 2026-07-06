import type { Goal, NutrientTotals, NutrientKey } from '@/types'
import { NUTRIENT_KEYS, NUTRIENT_META, foodFixesFor } from './nutrients'
import { GOAL_LABELS, kgToLbs } from './fitness'
import { userDayKey, resolveTimeZone } from './day'

// ── Weekly Review 2.0 ────────────────────────────────────────────────────────
// A storytelling recap of the user's week. buildWeeklyReview is a pure function
// of the week's raw logs (plus a little history for streaks/goals), so it can be
// unit-reasoned and rendered identically on server or client.

export const ACTIVE_DAYS_GOAL = 4
const HYDRATION_GOAL_DAYS = 7
const KCAL_PER_MILE_WALK = 105   // ~rough walking cost per mile for the "equivalent to" line
const KCAL_PER_BURGER = 250      // playful equivalent

export interface ReviewFood {
  logged_at: string
  total_calories: number | null
  nutrient_totals: NutrientTotals | null
  meal_type: string | null
  foods: { name?: string }[] | null
}
export interface ReviewActivity { logged_at: string; calories_burned: number | null }
export interface ReviewWater { logged_at: string; amount_ml: number | null }
export interface ReviewWeight { logged_at: string; weight_kg: number }

// One group member's week, pre-aggregated by the caller (includes the viewer).
export interface GroupStanding {
  userId: string
  name: string
  daysLogged: number
  activeDays: number
  streak: number
}

// Localized, data-derived strings the generator bakes into the review. Supplied
// by the caller (from the i18n dictionary); defaults to English so the pure
// function stays testable without wiring i18n.
export interface WeeklyReviewStrings {
  dateLocale: string
  goalFallback: string
  goalLabel: (g: Goal) => string
  goalAtWeight: string
  goalLbsToGo: (n: number) => string
  goalPctWay: (pct: number) => string
  goalHoldSteady: string
  goalLbsFromSet: (n: number) => string
  goalMaintenance: string
  goalBuildingHabits: string
  goalEveryDay: string
  breakdownLogging: string
  breakdownActivity: string
  breakdownHydration: string
  breakdownCalories: string
  nutrientLabel: (key: NutrientKey) => string
  groupMostConsistent: string
  groupLongestStreak: string
  groupMostActive: string
  groupConsistentValue: (name: string, days: number) => string
  groupStreakValue: (name: string, streak: number) => string
  groupActiveValue: (name: string, days: number) => string
  missionHydrationTitle: string
  missionHydrationFoods: string[]
  missionImprove: (label: string) => string
  missionActivityTitle: (n: number) => string
  missionActivityFoods: string[]
  missionConsistencyTitle: string
  missionConsistencyFoods: string[]
  foodFixName: (name: string) => string
}

export const EN_WEEKLY_STRINGS: WeeklyReviewStrings = {
  dateLocale: 'en-US',
  goalFallback: 'Your goal',
  goalLabel: (g) => GOAL_LABELS[g],
  goalAtWeight: 'At your goal weight 🎉',
  goalLbsToGo: (n) => `${n} lbs to go`,
  goalPctWay: (pct) => `${pct}% of the way there`,
  goalHoldSteady: 'Holding steady ⚖️',
  goalLbsFromSet: (n) => `${n} lbs from your set point`,
  goalMaintenance: 'Maintenance mode',
  goalBuildingHabits: 'Building healthy habits',
  goalEveryDay: 'Every logged day compounds',
  breakdownLogging: 'Logging',
  breakdownActivity: 'Activity',
  breakdownHydration: 'Hydration',
  breakdownCalories: 'Calories',
  nutrientLabel: (key) => NUTRIENT_META[key].label,
  groupMostConsistent: 'Most consistent',
  groupLongestStreak: 'Longest streak',
  groupMostActive: 'Most active',
  groupConsistentValue: (name, days) => `${name} · ${days}/7 days`,
  groupStreakValue: (name, streak) => `${name} · ${streak}🔥`,
  groupActiveValue: (name, days) => `${name} · ${days} days`,
  missionHydrationTitle: 'Hit your water goal 5 days',
  missionHydrationFoods: ['Start the day with a glass', 'Carry a bottle', 'A glass with each meal'],
  missionImprove: (label) => `Improve ${label}`,
  missionActivityTitle: (n) => `Reach ${n} active days`,
  missionActivityFoods: ['A brisk 20-min walk', 'One strength session', 'Take the stairs'],
  missionConsistencyTitle: 'Keep your streak alive',
  missionConsistencyFoods: ['Log every meal', 'Hydrate daily', 'Move most days'],
  foodFixName: (name) => name,
}

export interface WeeklyReviewInput {
  now?: Date
  foods: ReviewFood[]
  activities: ReviewActivity[]
  waters: ReviewWater[]
  weights: ReviewWeight[]
  calorieTarget: number
  waterTargetMl: number
  goal: Goal | null
  currentWeightKg: number | null
  targetWeightKg: number | null
  streak: number
  myUserId: string
  group: GroupStanding[] | null
  timeZone?: string   // IANA zone to bucket days in (the viewer's). Defaults to runtime.
  strings?: WeeklyReviewStrings   // localized output strings; defaults to English.
}

export interface NutrientRef { key: NutrientKey; label: string; emoji: string; pct: number }

export interface WeeklyReview {
  weekLabel: string
  hasData: boolean
  cover: { mealsLogged: number; workouts: number; hydrationDays: number; daysLogged: number }
  consistency: { score: number; breakdown: { label: string; pct: number }[] }
  bestDay: { weekday: string; nutrientsHit: number; nutrientsTotal: number; active: boolean; hydrated: boolean } | null
  nutrients: { champion: NutrientRef | null; lowest: NutrientRef | null; onTrack: number; total: number }
  streak: number
  activity: { activeDays: number; goalDays: number; caloriesBurned: number; milesWalked: number; cheeseburgers: number }
  foodMvp: { name: string; emoji: string; count: number; favoriteMealType: string | null } | null
  goal: { label: string; headline: string; sub: string; pct: number | null }
  group: { rank: number; total: number; highlights: { label: string; value: string }[] } | null
  mission: { focus: string; title: string; foods: string[]; expectedImprovementPct: number | null }
  share: { streak: number; nutrientsOnTrack: number; activeDays: number; hydrationDays: number; hydrationGoalDays: number }
}

const fmt = (d: Date, locale: string) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })

// Map a few common foods to an emoji for the Food MVP spotlight; default 🍽️.
const FOOD_EMOJI: { match: RegExp; emoji: string }[] = [
  { match: /pineapple/i, emoji: '🍍' }, { match: /banana/i, emoji: '🍌' }, { match: /apple/i, emoji: '🍎' },
  { match: /egg/i, emoji: '🥚' }, { match: /chicken/i, emoji: '🍗' }, { match: /rice/i, emoji: '🍚' },
  { match: /coffee/i, emoji: '☕' }, { match: /salad/i, emoji: '🥗' }, { match: /avocado/i, emoji: '🥑' },
  { match: /yogurt|yoghurt/i, emoji: '🥛' }, { match: /oat/i, emoji: '🥣' }, { match: /salmon|fish|tuna/i, emoji: '🐟' },
  { match: /beef|steak|burger/i, emoji: '🥩' }, { match: /bread|toast/i, emoji: '🍞' }, { match: /berr|strawberr/i, emoji: '🍓' },
  { match: /almond|nut/i, emoji: '🥜' }, { match: /cheese/i, emoji: '🧀' }, { match: /broccoli/i, emoji: '🥦' },
]
function foodEmoji(name: string): string {
  return FOOD_EMOJI.find(f => f.match.test(name))?.emoji ?? '🍽️'
}

export function buildWeeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const now = input.now ?? new Date()
  const S = input.strings ?? EN_WEEKLY_STRINGS
  const calorieTarget = input.calorieTarget || 2000
  const waterTarget = input.waterTargetMl || 2500
  const tz = resolveTimeZone(input.timeZone)
  const dk = (ts: string) => userDayKey(ts, tz)

  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6)
  const weekLabel = `${fmt(weekStart, S.dateLocale)} – ${fmt(now, S.dateLocale)}`

  // ── Per-day aggregation ────────────────────────────────────────────────────
  const foodDays = new Map<string, { cals: number; nutrients: NutrientTotals }>()
  for (const f of input.foods) {
    const k = dk(f.logged_at)
    const cur = foodDays.get(k) ?? { cals: 0, nutrients: {} as NutrientTotals }
    cur.cals += f.total_calories ?? 0
    for (const nk of NUTRIENT_KEYS) cur.nutrients[nk] = (cur.nutrients[nk] ?? 0) + (f.nutrient_totals?.[nk] ?? 0)
    foodDays.set(k, cur)
  }
  const daysLogged = foodDays.size
  const mealsLogged = input.foods.length

  const activeDaySet = new Set(input.activities.map(a => dk(a.logged_at)))
  const activeDays = activeDaySet.size
  const workouts = input.activities.length
  const caloriesBurned = Math.round(input.activities.reduce((s, a) => s + (a.calories_burned ?? 0), 0))

  const waterDays = new Map<string, number>()
  for (const w of input.waters) waterDays.set(dk(w.logged_at), (waterDays.get(dk(w.logged_at)) ?? 0) + (w.amount_ml ?? 0))
  const hydrationDays = [...waterDays.values()].filter(ml => ml >= waterTarget).length

  // ── Nutrients (avg over logged days vs daily target) ───────────────────────
  const totalNutrients = {} as NutrientTotals
  for (const day of foodDays.values()) for (const nk of NUTRIENT_KEYS) totalNutrients[nk] = (totalNutrients[nk] ?? 0) + day.nutrients[nk]
  const nutrientRefs: NutrientRef[] = NUTRIENT_KEYS.map(key => {
    const avg = daysLogged ? (totalNutrients[key] ?? 0) / daysLogged : 0
    const pct = Math.round((avg / NUTRIENT_META[key].target) * 100)
    return { key, label: S.nutrientLabel(key), emoji: NUTRIENT_META[key].emoji, pct }
  })
  const sortedNutrients = [...nutrientRefs].sort((a, b) => b.pct - a.pct)
  const champion = daysLogged ? sortedNutrients[0] : null
  const lowest = daysLogged ? sortedNutrients[sortedNutrients.length - 1] : null
  const onTrack = nutrientRefs.filter(n => n.pct >= 100).length

  // ── Best day (most nutrient targets hit; tie-break active + hydrated) ──────
  let bestDay: WeeklyReview['bestDay'] = null
  for (const [k, day] of foodDays) {
    const hits = NUTRIENT_KEYS.filter(nk => (day.nutrients[nk] ?? 0) >= NUTRIENT_META[nk].target).length
    const active = activeDaySet.has(k)
    const hydrated = (waterDays.get(k) ?? 0) >= waterTarget
    const better = !bestDay
      || hits > bestDay.nutrientsHit
      || (hits === bestDay.nutrientsHit && (Number(active) + Number(hydrated)) > (Number(bestDay.active) + Number(bestDay.hydrated)))
    if (better) {
      bestDay = {
        weekday: new Date(k + 'T12:00:00Z').toLocaleDateString(S.dateLocale, { weekday: 'long', timeZone: 'UTC' }),
        nutrientsHit: hits, nutrientsTotal: NUTRIENT_KEYS.length, active, hydrated,
      }
    }
  }

  // ── Consistency score (0–100, mean of four dimensions) ─────────────────────
  const logScore = Math.round((daysLogged / 7) * 100)
  const actScore = Math.min(100, Math.round((activeDays / ACTIVE_DAYS_GOAL) * 100))
  const hydScore = Math.round((hydrationDays / HYDRATION_GOAL_DAYS) * 100)
  const avgCals = daysLogged ? Math.round([...foodDays.values()].reduce((s, d) => s + d.cals, 0) / daysLogged) : 0
  const adherence = daysLogged ? Math.max(0, Math.round(100 - (Math.abs(avgCals - calorieTarget) / calorieTarget) * 100)) : 0
  const score = Math.round((logScore + actScore + hydScore + adherence) / 4)
  const consistency = {
    score,
    breakdown: [
      { label: S.breakdownLogging, pct: logScore },
      { label: S.breakdownActivity, pct: actScore },
      { label: S.breakdownHydration, pct: hydScore },
      { label: S.breakdownCalories, pct: adherence },
    ],
  }

  // ── Food MVP ───────────────────────────────────────────────────────────────
  const nameCounts = new Map<string, { display: string; n: number }>()
  const mealTypeCounts = new Map<string, number>()
  for (const f of input.foods) {
    if (f.meal_type) mealTypeCounts.set(f.meal_type, (mealTypeCounts.get(f.meal_type) ?? 0) + 1)
    for (const item of f.foods ?? []) {
      const raw = (item.name ?? '').trim()
      if (!raw) continue
      const key = raw.toLowerCase()
      const cur = nameCounts.get(key) ?? { display: raw, n: 0 }
      cur.n += 1
      nameCounts.set(key, cur)
    }
  }
  const topFood = [...nameCounts.values()].sort((a, b) => b.n - a.n)[0]
  const favoriteMealType = [...mealTypeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const foodMvp = topFood && topFood.n >= 2
    ? { name: topFood.display, emoji: foodEmoji(topFood.display), count: topFood.n, favoriteMealType }
    : null

  // ── Goal progress ──────────────────────────────────────────────────────────
  const goal = buildGoalProgress(input, S)

  // ── Group performance ──────────────────────────────────────────────────────
  let group: WeeklyReview['group'] = null
  if (input.group && input.group.length >= 2) {
    const ranked = [...input.group].sort((a, b) => b.daysLogged - a.daysLogged || b.streak - a.streak || b.activeDays - a.activeDays)
    const rank = ranked.findIndex(m => m.userId === input.myUserId) + 1
    const mostConsistent = [...input.group].sort((a, b) => b.daysLogged - a.daysLogged)[0]
    const longestStreak = [...input.group].sort((a, b) => b.streak - a.streak)[0]
    const mostActive = [...input.group].sort((a, b) => b.activeDays - a.activeDays)[0]
    group = {
      rank: rank || ranked.length,
      total: input.group.length,
      highlights: [
        { label: S.groupMostConsistent, value: S.groupConsistentValue(mostConsistent.name, mostConsistent.daysLogged) },
        { label: S.groupLongestStreak, value: S.groupStreakValue(longestStreak.name, longestStreak.streak) },
        { label: S.groupMostActive, value: S.groupActiveValue(mostActive.name, mostActive.activeDays) },
      ],
    }
  }

  // ── Next week mission (target the weakest, most actionable dimension) ───────
  const mission = buildMission({ lowest, hydrationDays, activeDays, daysLogged }, S)

  return {
    weekLabel,
    hasData: daysLogged > 0 || workouts > 0 || waterDays.size > 0,
    cover: { mealsLogged, workouts, hydrationDays, daysLogged },
    consistency,
    bestDay,
    nutrients: { champion, lowest, onTrack, total: NUTRIENT_KEYS.length },
    streak: input.streak,
    activity: {
      activeDays, goalDays: ACTIVE_DAYS_GOAL, caloriesBurned,
      milesWalked: Math.round(caloriesBurned / KCAL_PER_MILE_WALK),
      cheeseburgers: Math.round(caloriesBurned / KCAL_PER_BURGER),
    },
    foodMvp,
    goal,
    group,
    mission,
    share: {
      streak: input.streak,
      nutrientsOnTrack: onTrack,
      activeDays,
      hydrationDays,
      hydrationGoalDays: HYDRATION_GOAL_DAYS,
    },
  }
}

function buildGoalProgress(input: WeeklyReviewInput, S: WeeklyReviewStrings): WeeklyReview['goal'] {
  const label = input.goal ? S.goalLabel(input.goal) : S.goalFallback
  const cur = input.currentWeightKg
  const tgt = input.targetWeightKg
  // Earliest weigh-in we have is the baseline for percent-complete.
  const start = input.weights.length ? input.weights.reduce((a, b) => (a.logged_at < b.logged_at ? a : b)).weight_kg : cur

  if ((input.goal === 'lose_weight' || input.goal === 'build_muscle') && cur != null && tgt != null && start != null && start !== tgt) {
    const remaining = Math.abs(Math.round(kgToLbs(cur) - kgToLbs(tgt)))
    const pct = Math.max(0, Math.min(100, Math.round(((start - cur) / (start - tgt)) * 100)))
    return {
      label,
      headline: remaining === 0 ? S.goalAtWeight : S.goalLbsToGo(remaining),
      sub: S.goalPctWay(pct),
      pct,
    }
  }
  if (input.goal === 'maintain' && cur != null && tgt != null) {
    const off = Math.abs(Math.round(kgToLbs(cur) - kgToLbs(tgt)))
    return { label, headline: off <= 2 ? S.goalHoldSteady : S.goalLbsFromSet(off), sub: S.goalMaintenance, pct: null }
  }
  // Improve health / no weight goal → celebrate consistency framing.
  return { label, headline: S.goalBuildingHabits, sub: S.goalEveryDay, pct: null }
}

function buildMission(opts: { lowest: NutrientRef | null; hydrationDays: number; activeDays: number; daysLogged: number }, S: WeeklyReviewStrings): WeeklyReview['mission'] {
  const { lowest, hydrationDays, activeDays } = opts
  // Hydration is the weakest and clearly fixable → hydration mission.
  if (hydrationDays <= 2 && (lowest?.pct ?? 100) >= 40) {
    return { focus: 'Hydration', title: S.missionHydrationTitle, foods: S.missionHydrationFoods, expectedImprovementPct: null }
  }
  // Otherwise target the lowest nutrient with whole-food suggestions.
  if (lowest && lowest.pct < 80) {
    const foods = foodFixesFor(lowest.key).map(f => S.foodFixName(f.name)).slice(0, 3)
    const expected = Math.min(40, Math.max(10, 100 - lowest.pct) >> 1) // ~half the gap, capped
    return { focus: lowest.label, title: S.missionImprove(lowest.label), foods, expectedImprovementPct: expected }
  }
  // Everything's solid → keep momentum on activity.
  if (activeDays < ACTIVE_DAYS_GOAL) {
    return { focus: 'Activity', title: S.missionActivityTitle(ACTIVE_DAYS_GOAL), foods: S.missionActivityFoods, expectedImprovementPct: null }
  }
  return { focus: 'Consistency', title: S.missionConsistencyTitle, foods: S.missionConsistencyFoods, expectedImprovementPct: null }
}
