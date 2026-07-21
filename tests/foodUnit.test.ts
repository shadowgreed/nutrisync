import { describe, it, expect } from 'vitest'
import { gToOz, ozToG, servingForDisplay, servingFromDisplay, formatServing } from '../lib/foodUnit'

describe('gToOz / ozToG', () => {
  it('converts grams to ounces to one decimal', () => {
    expect(gToOz(28.3495)).toBe(1)
    expect(gToOz(150)).toBeCloseTo(5.3, 5)
  })

  it('converts ounces to whole grams', () => {
    expect(ozToG(1)).toBe(28)
    expect(ozToG(5.3)).toBe(150)
  })

  it('round-trips within 1g (each conversion rounds once, like kgToLbs/lbsToKg)', () => {
    const g = 200
    expect(Math.abs(ozToG(gToOz(g)) - g)).toBeLessThanOrEqual(1)
  })
})

describe('servingForDisplay / servingFromDisplay', () => {
  it('passes grams through as whole numbers', () => {
    expect(servingForDisplay(150.4, 'g')).toBe(150)
    expect(servingFromDisplay(150, 'g')).toBe(150)
  })

  it('converts to/from ounces', () => {
    expect(servingForDisplay(150, 'oz')).toBeCloseTo(5.3, 5)
    expect(servingFromDisplay(5.3, 'oz')).toBe(150)
  })
})

describe('formatServing', () => {
  it('formats grams', () => {
    expect(formatServing(150, 'g')).toBe('150 g')
  })

  it('formats ounces', () => {
    expect(formatServing(150, 'oz')).toBe('5.3 oz')
  })
})
