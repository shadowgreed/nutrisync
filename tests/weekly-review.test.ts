import { describe, it, expect } from 'vitest'
import { buildWeeklyReview, type WeeklyReviewInput } from '@/lib/weekly-review'
import { NUTRIENT_KEYS, emptyTotals } from '@/lib/nutrients'

const TZ = 'America/New_York'
const now = new Date('2026-06-24T18:00:00Z')
const ts = (day: string) => `${day}T12:00:00Z` // midday UTC = same calendar day in NY

const zeroNutrients = emptyTotals

function baseInput(overrides: Partial<WeeklyReviewInput> = {}): WeeklyReviewInput {
  return {
    now,
    foods: [],
    activities: [],
    waters: [],
    weights: [],
    calorieTarget: 2000,
    waterTargetMl: 2000,
    goal: 'maintain',
    currentWeightKg: null,
    targetWeightKg: null,
    streak: 3,
    myUserId: 'me',
    group: null,
    timeZone: TZ,
    ...overrides,
  }
}

describe('buildWeeklyReview', () => {
  it('an empty week has no data', () => {
    const r = buildWeeklyReview(baseInput())
    expect(r.hasData).toBe(false)
    expect(r.cover.mealsLogged).toBe(0)
    expect(r.cover.daysLogged).toBe(0)
  })

  it('aggregates meals, days, workouts, and burned calories', () => {
    const meal = (day: string, cals: number) => ({
      logged_at: ts(day), total_calories: cals,
      nutrient_totals: zeroNutrients(), meal_type: 'lunch', foods: [{ name: 'Rice' }],
    })
    const r = buildWeeklyReview(baseInput({
      foods: [meal('2026-06-22', 600), meal('2026-06-22', 500), meal('2026-06-23', 700)],
      activities: [
        { logged_at: ts('2026-06-22'), calories_burned: 250 },
        { logged_at: ts('2026-06-24'), calories_burned: 150 },
      ],
    }))
    expect(r.hasData).toBe(true)
    expect(r.cover.mealsLogged).toBe(3)
    expect(r.cover.daysLogged).toBe(2)     // two distinct food days
    expect(r.cover.workouts).toBe(2)
    expect(r.activity.activeDays).toBe(2)
    expect(r.activity.caloriesBurned).toBe(400)
    expect(r.streak).toBe(3)               // passthrough
  })

  it('counts a hydration day only when the daily total reaches the target', () => {
    const r = buildWeeklyReview(baseInput({
      waters: [
        { logged_at: ts('2026-06-22'), amount_ml: 1200 },
        { logged_at: ts('2026-06-22'), amount_ml: 800 },  // 2000 total → hits the 2000 target
        { logged_at: ts('2026-06-23'), amount_ml: 1999 }, // just under → no
      ],
    }))
    expect(r.cover.hydrationDays).toBe(1)
    expect(r.hasData).toBe(true) // water alone counts as data
  })

  it('reports the nutrient universe and mirrors the share block', () => {
    const meal = {
      logged_at: ts('2026-06-22'), total_calories: 500,
      nutrient_totals: zeroNutrients(), meal_type: 'dinner', foods: [{ name: 'Salmon' }],
    }
    const r = buildWeeklyReview(baseInput({ foods: [meal] }))
    expect(r.nutrients.total).toBe(NUTRIENT_KEYS.length)
    expect(r.share.streak).toBe(3)
    expect(r.share.activeDays).toBe(r.activity.activeDays)
    expect(r.share.hydrationDays).toBe(r.cover.hydrationDays)
  })

  it('buckets days in the given timezone (a late-UTC log stays on its local day)', () => {
    // 2026-06-23 02:00 UTC is still 2026-06-22 in New York.
    const r = buildWeeklyReview(baseInput({
      foods: [
        { logged_at: '2026-06-22T12:00:00Z', total_calories: 500, nutrient_totals: zeroNutrients(), meal_type: 'lunch', foods: null },
        { logged_at: '2026-06-23T02:00:00Z', total_calories: 300, nutrient_totals: zeroNutrients(), meal_type: 'snack', foods: null },
      ],
    }))
    expect(r.cover.daysLogged).toBe(1) // both land on 2026-06-22 in NY
  })
})
