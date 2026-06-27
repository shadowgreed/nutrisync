import { describe, it, expect } from 'vitest'
import {
  calculateBMR, calculateTDEE, calculateCalorieTarget, calculateBMI,
  kgToLbs, lbsToKg, ftInToCm,
} from '@/lib/fitness'

describe('calculateBMR (Mifflin-St Jeor)', () => {
  it('applies the +5 offset for male/unspecified and -161 for female', () => {
    // 80kg, 180cm, 30y
    const base = 10 * 80 + 6.25 * 180 - 5 * 30 // 1775
    expect(calculateBMR(80, 180, 30, 'male')).toBe(base + 5)
    expect(calculateBMR(80, 180, 30, 'prefer_not_to_say')).toBe(base + 5)
    expect(calculateBMR(80, 180, 30, 'female')).toBe(base - 161)
  })
})

describe('calculateTDEE', () => {
  it('multiplies BMR by the activity factor and rounds', () => {
    expect(calculateTDEE(1780, 'sedentary')).toBe(Math.round(1780 * 1.2))
    expect(calculateTDEE(1780, 'very_active')).toBe(Math.round(1780 * 1.9))
  })
})

describe('calculateCalorieTarget', () => {
  it('applies a deficit, surplus, or maintenance by goal', () => {
    expect(calculateCalorieTarget(2500, 'lose_weight')).toBe(2000)
    expect(calculateCalorieTarget(2500, 'build_muscle')).toBe(2800)
    expect(calculateCalorieTarget(2500, 'maintain')).toBe(2500)
    expect(calculateCalorieTarget(2500, 'improve_health')).toBe(2500)
  })
})

describe('calculateBMI', () => {
  it('computes weight / height^2 to one decimal', () => {
    expect(calculateBMI(80, 180)).toBe(24.7)
  })
})

describe('unit conversions are inverse', () => {
  it('kg <-> lbs round-trips closely', () => {
    expect(kgToLbs(lbsToKg(150))).toBeCloseTo(150, 0)
  })
  it('ftInToCm converts 5ft10in to ~178cm', () => {
    expect(Math.round(ftInToCm(5, 10))).toBe(178)
  })
})
