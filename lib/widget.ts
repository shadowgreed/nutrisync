import { userDayKey } from './day'

// The snapshot a home-screen widget renders. Deliberately tiny and flat so it
// serializes cheaply into a native shared container (iOS App Group /
// Android DataStore) and over the wire.
export interface WidgetSummary {
  date: string                                   // today's key in the user's tz (YYYY-MM-DD)
  calories: { consumed: number; target: number | null }
  water: { ml: number; targetMl: number }
  streak: number
  updatedAt: string                              // ISO timestamp of when this was computed
}

interface FoodRow { total_calories?: number | null; logged_at: string }
interface WaterRow { amount_ml?: number | null; logged_at: string }

/**
 * Compute today's glanceable totals for the widget. Pure: callers pass a window
 * of logs (e.g. last 48h) and this filters to "today" in the user's timezone —
 * mirroring how the dashboard derives the same numbers, so the widget and the
 * app never disagree.
 */
export function buildWidgetSummary(input: {
  foodLogs: FoodRow[]
  waterLogs: WaterRow[]
  calorieTarget: number | null
  waterTargetMl: number
  streak: number
  timeZone: string
  now?: Date
}): WidgetSummary {
  const now = input.now ?? new Date()
  const today = userDayKey(now, input.timeZone)
  const isToday = (ts: string) => userDayKey(ts, input.timeZone) === today

  const consumed = input.foodLogs
    .filter(f => isToday(f.logged_at))
    .reduce((s, f) => s + (Number(f.total_calories) || 0), 0)

  const waterMl = input.waterLogs
    .filter(w => isToday(w.logged_at))
    .reduce((s, w) => s + (Number(w.amount_ml) || 0), 0)

  return {
    date: today,
    calories: { consumed: Math.round(consumed), target: input.calorieTarget },
    water: { ml: Math.round(waterMl), targetMl: input.waterTargetMl },
    streak: input.streak,
    updatedAt: now.toISOString(),
  }
}
