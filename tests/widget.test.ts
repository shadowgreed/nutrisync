import { describe, it, expect } from 'vitest'
import { buildWidgetSummary } from '@/lib/widget'

const TZ = 'America/New_York'
const now = new Date('2026-06-24T18:00:00Z') // afternoon of the 24th in NY

describe('buildWidgetSummary', () => {
  it('sums only today (user timezone) for calories and water', () => {
    const s = buildWidgetSummary({
      foodLogs: [
        { total_calories: 500, logged_at: '2026-06-24T13:00:00Z' }, // today
        { total_calories: 300, logged_at: '2026-06-24T20:00:00Z' }, // today
        { total_calories: 999, logged_at: '2026-06-23T13:00:00Z' }, // yesterday — excluded
      ],
      waterLogs: [
        { amount_ml: 600, logged_at: '2026-06-24T12:00:00Z' },
        { amount_ml: 400, logged_at: '2026-06-23T12:00:00Z' }, // excluded
      ],
      calorieTarget: 2100,
      waterTargetMl: 2500,
      streak: 12,
      timeZone: TZ,
      now,
    })
    expect(s.date).toBe('2026-06-24')
    expect(s.calories).toEqual({ consumed: 800, target: 2100 })
    expect(s.water).toEqual({ ml: 600, targetMl: 2500 })
    expect(s.streak).toBe(12)
    expect(s.updatedAt).toBe(now.toISOString())
  })

  it('respects the timezone day boundary (a 02:00 UTC log is "yesterday" in NY)', () => {
    const s = buildWidgetSummary({
      foodLogs: [{ total_calories: 250, logged_at: '2026-06-24T02:00:00Z' }],
      waterLogs: [],
      calorieTarget: 2000,
      waterTargetMl: 2500,
      streak: 0,
      timeZone: TZ,
      now,
    })
    expect(s.calories.consumed).toBe(0) // that log belongs to the 23rd in NY
  })

  it('handles empty logs and a null target', () => {
    const s = buildWidgetSummary({
      foodLogs: [], waterLogs: [], calorieTarget: null, waterTargetMl: 2500, streak: 0, timeZone: TZ, now,
    })
    expect(s.calories).toEqual({ consumed: 0, target: null })
    expect(s.water.ml).toBe(0)
  })
})
