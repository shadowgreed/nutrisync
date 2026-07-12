import type { FoodEntry, MealType } from '@/types'

/**
 * Quick Log ranking — pure, framework-free (see docs/quick-log-feature-spec).
 *
 * Derives "your usual" suggestions from the user's own food_logs history:
 * no new tracking, no AI calls. Consumed by app/api/quick-log/route.ts.
 *
 * Currently wired up for snacks only (components/MealLogger.tsx only renders
 * the suggestions UI when mealType === 'snack') — snacking tends to be
 * habitual and repetitive in a way that rewards this kind of suggestion more
 * than planned meals do. Both ranking functions filter to the requested
 * meal type, so a snack suggestion reflects what the user actually snacks
 * on, not foods eaten at other meals — the model keeps learning as new
 * snack logs arrive and old ones age out of relevance.
 *
 *   score = frequency × recencyDecay
 *
 * - frequency:    times the food appeared at this meal type in the window
 * - recencyDecay: exp(-daysSinceLastLogged / 14) — half-life ≈ 2 weeks, so
 *   foods the user stopped eating fade out on their own as habits change
 */

export interface QuickLogSourceRow {
  meal_type: MealType
  logged_at: string
  foods: FoodEntry[]
}

export interface RankedFood {
  entry: FoodEntry        // most recently used version (name, nutrition, portion)
  timesLogged: number
  lastLoggedAt: string
}

export interface RankedMeal {
  names: string[]         // display names, client builds the localized label
  entries: FoodEntry[]    // full FoodEntry[] from the most recent instance
  totalCalories: number
  timesLogged: number
}

const HALF_LIFE_DAYS = 14
const MAX_FOODS = 8
const MAX_MEALS = 3
// A meal must repeat to count as a habit — one-off dinners aren't "again".
const MIN_MEAL_REPEATS = 2

/** Dedupe key: photo-analyzed foods have no stable fdcId, so key on name. */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function recencyWeight(lastLoggedAt: string, now: Date): number {
  const days = Math.max(0, (now.getTime() - Date.parse(lastLoggedAt)) / 86_400_000)
  return Math.exp(-days / HALF_LIFE_DAYS)
}

export function rankFoods(
  rows: QuickLogSourceRow[],
  mealType: MealType,
  now: Date = new Date(),
  max: number = MAX_FOODS,
): RankedFood[] {
  interface Acc { count: number; lastAt: string; entry: FoodEntry }
  const byName = new Map<string, Acc>()

  for (const row of rows) {
    if (row.meal_type !== mealType) continue
    for (const f of row.foods ?? []) {
      if (!f?.name) continue
      const key = normalizeName(f.name)
      const acc = byName.get(key)
      if (!acc) {
        byName.set(key, { count: 1, lastAt: row.logged_at, entry: f })
      } else {
        acc.count++
        // Most recent portion wins as the suggested default ("your usual amount")
        if (Date.parse(row.logged_at) > Date.parse(acc.lastAt)) {
          acc.lastAt = row.logged_at
          acc.entry = f
        }
      }
    }
  }

  return [...byName.values()]
    .map(acc => ({ acc, score: acc.count * recencyWeight(acc.lastAt, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ acc }) => ({ entry: acc.entry, timesLogged: acc.count, lastLoggedAt: acc.lastAt }))
}

export function rankMeals(
  rows: QuickLogSourceRow[],
  mealType: MealType,
  now: Date = new Date(),
  max: number = MAX_MEALS,
): RankedMeal[] {
  interface Acc { count: number; lastAt: string; entries: FoodEntry[] }
  const byCombo = new Map<string, Acc>()

  for (const row of rows) {
    if (row.meal_type !== mealType) continue
    const foods = (row.foods ?? []).filter(f => f?.name)
    if (!foods.length) continue
    // A "meal" is the set of foods, order-independent
    const key = foods.map(f => normalizeName(f.name)).sort().join('|')
    const acc = byCombo.get(key)
    if (!acc) {
      byCombo.set(key, { count: 1, lastAt: row.logged_at, entries: foods })
    } else {
      acc.count++
      // Keep the most recent instance's entries (freshest portions/nutrition)
      if (Date.parse(row.logged_at) > Date.parse(acc.lastAt)) {
        acc.lastAt = row.logged_at
        acc.entries = foods
      }
    }
  }

  return [...byCombo.values()]
    .filter(acc => acc.count >= MIN_MEAL_REPEATS)
    .map(acc => ({ acc, score: acc.count * recencyWeight(acc.lastAt, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ acc }) => ({
      names: acc.entries.map(f => f.name),
      entries: acc.entries,
      totalCalories: Math.round(acc.entries.reduce((s, f) => s + (f.calories ?? 0), 0)),
      timesLogged: acc.count,
    }))
}
