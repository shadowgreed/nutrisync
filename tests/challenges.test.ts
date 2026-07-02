import { describe, it, expect } from 'vitest'
import {
  memberSuccessDays, challengeStreak, challengeStatus,
  dayIndex, totalDays, daysRemaining, isOnTrack, suggestedGoal,
  PROTEIN_DAY_THRESHOLD, WATER_DAY_THRESHOLD_ML,
} from '@/lib/challenges'

const TZ = 'America/New_York'
// Midday UTC timestamps → unambiguous calendar day in every tested zone.
const ts = (day: string) => `${day}T12:00:00Z`

describe('memberSuccessDays', () => {
  const win = { start: '2026-06-20', end: '2026-06-26' }

  it('log_days: counts distinct food-logged days inside the window only', () => {
    const days = memberSuccessDays('log_days', win.start, win.end, {
      food: [
        { logged_at: ts('2026-06-21') },
        { logged_at: ts('2026-06-21') },   // same day — not double-counted
        { logged_at: ts('2026-06-23') },
        { logged_at: ts('2026-06-19') },   // before the window — excluded
      ],
      activityDayKeys: new Set(),
      waterMlByDayKey: new Map(),
    }, TZ)
    expect([...days].sort()).toEqual(['2026-06-21', '2026-06-23'])
  })

  it('protein_days: a day counts only at or above the threshold, summed across meals', () => {
    const meal = (day: string, protein: number) => ({
      logged_at: ts(day),
      macro_totals: { protein_g: protein, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    })
    const days = memberSuccessDays('protein_days', win.start, win.end, {
      food: [
        meal('2026-06-21', PROTEIN_DAY_THRESHOLD / 2),
        meal('2026-06-21', PROTEIN_DAY_THRESHOLD / 2), // sums to exactly the threshold
        meal('2026-06-22', PROTEIN_DAY_THRESHOLD - 1), // just under — no credit
      ],
      activityDayKeys: new Set(),
      waterMlByDayKey: new Map(),
    }, TZ)
    expect([...days]).toEqual(['2026-06-21'])
  })

  it('water_days: threshold applies per day, window filters keys', () => {
    const days = memberSuccessDays('water_days', win.start, win.end, {
      food: [],
      activityDayKeys: new Set(),
      waterMlByDayKey: new Map([
        ['2026-06-21', WATER_DAY_THRESHOLD_ML],       // exactly at threshold — counts
        ['2026-06-22', WATER_DAY_THRESHOLD_ML - 1],   // under — no
        ['2026-06-19', WATER_DAY_THRESHOLD_ML * 2],   // outside window — no
      ]),
    })
    expect([...days]).toEqual(['2026-06-21'])
  })

  it('active_days: passes through pre-bucketed keys, window-filtered', () => {
    const days = memberSuccessDays('active_days', win.start, win.end, {
      food: [],
      activityDayKeys: new Set(['2026-06-20', '2026-06-26', '2026-06-27']),
      waterMlByDayKey: new Map(),
    })
    expect([...days].sort()).toEqual(['2026-06-20', '2026-06-26'])
  })
})

describe('challengeStreak', () => {
  const win = { start: '2026-06-20', end: '2026-06-26' }

  it('counts the run ending today', () => {
    const success = new Set(['2026-06-22', '2026-06-23', '2026-06-24'])
    expect(challengeStreak(success, win.start, win.end, '2026-06-24')).toBe(3)
  })

  it("grants one-day grace when today isn't earned yet", () => {
    const success = new Set(['2026-06-22', '2026-06-23'])
    expect(challengeStreak(success, win.start, win.end, '2026-06-24')).toBe(2)
  })

  it('is 0 when neither today nor yesterday succeeded', () => {
    const success = new Set(['2026-06-20'])
    expect(challengeStreak(success, win.start, win.end, '2026-06-24')).toBe(0)
  })

  it('after the challenge ends, counts the run ending on the final day', () => {
    const success = new Set(['2026-06-25', '2026-06-26'])
    expect(challengeStreak(success, win.start, win.end, '2026-06-30')).toBe(2)
  })
})

describe('challengeStatus / dayIndex / totalDays / daysRemaining', () => {
  const start = '2026-06-20', end = '2026-06-26'

  it('status transitions on the boundary days', () => {
    expect(challengeStatus(start, end, '2026-06-19')).toBe('upcoming')
    expect(challengeStatus(start, end, '2026-06-20')).toBe('active')
    expect(challengeStatus(start, end, '2026-06-26')).toBe('active')
    expect(challengeStatus(start, end, '2026-06-27')).toBe('ended')
  })

  it('a 7-day window has 7 days, 1-based index, clamped', () => {
    expect(totalDays(start, end)).toBe(7)
    expect(dayIndex(start, end, '2026-06-20')).toBe(1)
    expect(dayIndex(start, end, '2026-06-23')).toBe(4)
    expect(dayIndex(start, end, '2026-06-30')).toBe(7) // clamped after end
  })

  it('daysRemaining floors at 0', () => {
    expect(daysRemaining(end, '2026-06-24')).toBe(2)
    expect(daysRemaining(end, '2026-06-27')).toBe(0)
  })
})

describe('isOnTrack', () => {
  const start = '2026-06-20', end = '2026-06-26' // 7 days, goal 7

  it('paces against completed days so day 1 is never "behind"', () => {
    expect(isOnTrack(0, 7, start, end, '2026-06-20')).toBe(true)
  })

  it('mid-challenge: at pace passes, under pace fails', () => {
    // Day 4 → 3 completed days → expected 3.
    expect(isOnTrack(3, 7, start, end, '2026-06-23')).toBe(true)
    expect(isOnTrack(2, 7, start, end, '2026-06-23')).toBe(false)
  })

  it('reaching the goal is always on track', () => {
    expect(isOnTrack(7, 7, start, end, '2026-06-26')).toBe(true)
  })
})

describe('suggestedGoal', () => {
  it('daily metrics default to every day; threshold metrics to ~70%', () => {
    expect(suggestedGoal('log_days', 7)).toBe(7)
    expect(suggestedGoal('active_days', 14)).toBe(14)
    expect(suggestedGoal('water_days', 7)).toBe(5)   // round(7 * 0.7)
    expect(suggestedGoal('protein_days', 30)).toBe(21)
  })
})
