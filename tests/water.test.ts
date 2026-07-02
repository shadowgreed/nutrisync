import { describe, it, expect } from 'vitest'
import { totalMlOnDay, buildWaterWeek, mlToOz, ozToMl } from '@/lib/water'

const TZ = 'America/New_York'

describe('totalMlOnDay', () => {
  it('sums only the requested calendar day in the given timezone', () => {
    const rows = [
      { logged_at: '2026-06-24T12:00:00Z', amount_ml: 500 },
      { logged_at: '2026-06-24T20:00:00Z', amount_ml: 300 },
      { logged_at: '2026-06-23T12:00:00Z', amount_ml: 999 }, // other day
    ]
    expect(totalMlOnDay(rows, TZ, '2026-06-24')).toBe(800)
  })

  it('respects the timezone day boundary (02:00 UTC belongs to the prior NY day)', () => {
    const rows = [{ logged_at: '2026-06-24T02:00:00Z', amount_ml: 400 }]
    expect(totalMlOnDay(rows, TZ, '2026-06-24')).toBe(0)
    expect(totalMlOnDay(rows, TZ, '2026-06-23')).toBe(400)
  })

  it('treats null/missing amounts as 0', () => {
    const rows = [{ logged_at: '2026-06-24T12:00:00Z', amount_ml: null }]
    expect(totalMlOnDay(rows, TZ, '2026-06-24')).toBe(0)
  })
})

describe('buildWaterWeek', () => {
  const now = new Date('2026-06-24T18:00:00Z')

  it('averages per logged day and counts days at target', () => {
    const rows = [
      { logged_at: '2026-06-23T12:00:00Z', amount_ml: 2500 }, // hits 2500 target
      { logged_at: '2026-06-24T12:00:00Z', amount_ml: 1500 }, // under
    ]
    const w = buildWaterWeek(rows, 2500, now, TZ)
    expect(w.daysLogged).toBe(2)
    expect(w.daysHit).toBe(1)
    expect(w.avgMl).toBe(2000)
    expect(w.goalDays).toBe(7)
  })

  it('falls back to the 2500 default when the target is unset', () => {
    const w = buildWaterWeek([], 0, now, TZ)
    expect(w.targetMl).toBe(2500)
  })
})

describe('ml/oz conversions', () => {
  it('round-trips within rounding error', () => {
    expect(mlToOz(ozToMl(64))).toBe(64)
  })
})
