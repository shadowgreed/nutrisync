import type { NutrientKey } from '@/types'
import { NUTRIENT_KEYS, NUTRIENT_META, foodFixesFor } from './nutrients'
import type { DayTotal } from './trends'

export interface CoachingInsight {
  key: NutrientKey
  label: string
  emoji: string
  daysHit: number
  daysLogged: number
  foods: Array<{ name: string; serving: string }>
}

/**
 * Look at the last week of logged days and surface the micronutrients the user
 * most consistently misses, with whole-food suggestions to close the gap.
 * Returns [] when there isn't enough data to be meaningful.
 */
export function weeklyCoaching(series: DayTotal[], maxInsights = 2): CoachingInsight[] {
  const loggedDays = series.filter(d => d.calories > 0).length
  if (loggedDays < 2) return [] // not enough signal yet

  return NUTRIENT_KEYS
    .map(key => {
      const meta = NUTRIENT_META[key]
      const daysHit = series.filter(d => (d.nutrients[key] ?? 0) >= meta.target).length
      return { key, label: meta.label, emoji: meta.emoji, daysHit, hitRate: daysHit / loggedDays }
    })
    .filter(r => r.hitRate < 0.5) // missed on the majority of logged days
    .sort((a, b) => a.hitRate - b.hitRate) // weakest first
    .slice(0, maxInsights)
    .map(r => ({
      key: r.key,
      label: r.label,
      emoji: r.emoji,
      daysHit: r.daysHit,
      daysLogged: loggedDays,
      foods: foodFixesFor(r.key).slice(0, 3),
    }))
}
