import { describe, it, expect } from 'vitest'
import { userDayKey, prevDayKey, nextDayKey, resolveTimeZone, dayOfWeek, isSunday, DEFAULT_TZ } from '@/lib/day'

describe('userDayKey', () => {
  it('returns the calendar date in the given timezone', () => {
    // 03:30 UTC on the 24th is still the 23rd in New York (UTC-4/5).
    expect(userDayKey('2026-06-24T03:30:00Z', 'America/New_York')).toBe('2026-06-23')
    // …and already the 24th in Tokyo (UTC+9).
    expect(userDayKey('2026-06-24T03:30:00Z', 'Asia/Tokyo')).toBe('2026-06-24')
  })

  it('is stable for a midday UTC timestamp across zones', () => {
    expect(userDayKey('2026-06-24T12:00:00Z', 'America/New_York')).toBe('2026-06-24')
    expect(userDayKey('2026-06-24T12:00:00Z', 'Europe/London')).toBe('2026-06-24')
  })
})

describe('prevDayKey / nextDayKey', () => {
  it('steps one calendar day and rolls months/years', () => {
    expect(prevDayKey('2026-06-24')).toBe('2026-06-23')
    expect(nextDayKey('2026-06-24')).toBe('2026-06-25')
    expect(prevDayKey('2026-01-01')).toBe('2025-12-31')
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01')
  })

  it('crosses a DST boundary without drifting (US spring-forward 2026-03-08)', () => {
    expect(nextDayKey('2026-03-07')).toBe('2026-03-08')
    expect(prevDayKey('2026-03-09')).toBe('2026-03-08')
  })
})

describe('dayOfWeek / isSunday', () => {
  it('dayOfWeek returns 0 for a Sunday key (2026-06-28 is a Sunday)', () => {
    expect(dayOfWeek('2026-06-28')).toBe(0)
    expect(dayOfWeek('2026-06-29')).toBe(1) // Monday
    expect(dayOfWeek('2026-06-27')).toBe(6) // Saturday
  })

  it('isSunday is timezone-aware at the day boundary', () => {
    // 2026-06-29 01:00 UTC is still Sunday the 28th in New York, but Monday the
    // 29th in Tokyo.
    const t = new Date('2026-06-29T01:00:00Z')
    expect(isSunday('America/New_York', t)).toBe(true)
    expect(isSunday('Asia/Tokyo', t)).toBe(false)
  })

  it('isSunday is false on a plain weekday', () => {
    expect(isSunday('America/New_York', new Date('2026-06-24T18:00:00Z'))).toBe(false)
  })
})

describe('resolveTimeZone', () => {
  it('passes through a valid IANA zone', () => {
    expect(resolveTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo')
  })
  it('falls back to the default for null/invalid input', () => {
    expect(resolveTimeZone(null)).toBe(DEFAULT_TZ)
    expect(resolveTimeZone('Not/AZone')).toBe(DEFAULT_TZ)
    expect(resolveTimeZone('')).toBe(DEFAULT_TZ)
  })
})
