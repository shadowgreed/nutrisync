import { describe, it, expect } from 'vitest'
import { computeStreak } from '@/lib/streak'

const TZ = 'America/New_York'
// Fixed "now" so the tests are deterministic regardless of when they run.
const now = new Date('2026-06-24T18:00:00Z') // afternoon of the 24th in NY

describe('computeStreak', () => {
  it('returns 0 with no logs', () => {
    expect(computeStreak([], { timeZone: TZ, now })).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    const logs = ['2026-06-24T13:00:00Z', '2026-06-23T13:00:00Z', '2026-06-22T13:00:00Z']
    expect(computeStreak(logs, { timeZone: TZ, now })).toBe(3)
  })

  it('keeps the streak alive when today is not yet logged (grace)', () => {
    const logs = ['2026-06-23T13:00:00Z', '2026-06-22T13:00:00Z']
    expect(computeStreak(logs, { timeZone: TZ, now })).toBe(2)
  })

  it('breaks when neither today nor yesterday is logged', () => {
    const logs = ['2026-06-21T13:00:00Z', '2026-06-20T13:00:00Z']
    expect(computeStreak(logs, { timeZone: TZ, now })).toBe(0)
  })

  it('dedupes multiple logs on the same day', () => {
    const logs = ['2026-06-24T13:00:00Z', '2026-06-24T20:00:00Z', '2026-06-23T13:00:00Z']
    expect(computeStreak(logs, { timeZone: TZ, now })).toBe(2)
  })

  it('respects the timezone boundary near midnight', () => {
    // 02:00 UTC on the 24th is still the 23rd in NY — so this is a "yesterday" log.
    const logs = ['2026-06-24T02:00:00Z']
    expect(computeStreak(logs, { timeZone: TZ, now })).toBe(1) // alive via grace
  })
})
