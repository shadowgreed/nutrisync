import type { ActivityLevel, Goal } from '@/types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:  1.2,
  light:      1.375,
  moderate:   1.55,
  active:     1.725,
  very_active: 1.9,
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight:     'Lose weight',
  maintain:        'Maintain weight',
  build_muscle:    'Build muscle',
  improve_health:  'Improve health',
}

export const GOAL_EMOJIS: Record<Goal, string> = {
  lose_weight:    '🔥',
  maintain:       '⚖️',
  build_muscle:   '💪',
  improve_health: '🌿',
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary (desk job, little exercise)',
  light:       'Light (1-3 days/week exercise)',
  moderate:    'Moderate (3-5 days/week exercise)',
  active:      'Active (6-7 days/week exercise)',
  very_active: 'Very active (physical job + training)',
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female' | 'prefer_not_to_say',
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'female') return base - 161
  return base + 5 // male or unspecified
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'lose_weight':    return Math.round(tdee - 500)  // ~0.5 kg/week deficit
    case 'build_muscle':   return Math.round(tdee + 300)  // modest surplus
    case 'maintain':       return tdee
    case 'improve_health': return tdee
  }
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25)   return 'Healthy'
  if (bmi < 30)   return 'Overweight'
  return 'Obese'
}

// MET-based calorie burn estimate for common activities
const MET_VALUES: Record<string, number> = {
  'Walking':          3.5,
  'Running':          9.8,
  'Cycling':          7.5,
  'Swimming':         8.0,
  'Weight training':  5.0,
  'HIIT':             8.0,
  'Yoga':             3.0,
  'Hiking':           5.3,
  'Jump rope':        10.0,
  'Rowing':           7.0,
  'Dancing':          5.5,
  'Pilates':          3.0,
  'Other':            5.0,
}

export const ACTIVITY_OPTIONS = Object.keys(MET_VALUES)

// Unit conversion helpers — DB always stores metric (kg, cm)
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10
}
export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54
  const ft = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { ft, inches }
}
export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54 * 10) / 10
}
export function formatWeight(kg: number, metric: boolean): string {
  return metric ? `${kg} kg` : `${kgToLbs(kg)} lbs`
}
export function formatHeight(cm: number, metric: boolean): string {
  if (metric) return `${cm} cm`
  const { ft, inches } = cmToFtIn(cm)
  return `${ft}′${inches}″`
}

export function estimateCaloriesBurned(
  activityName: string,
  durationMinutes: number,
  weightKg: number,
): number {
  const met = MET_VALUES[activityName] ?? 5.0
  // Calories = MET × weight(kg) × duration(hours)
  return Math.round(met * weightKg * (durationMinutes / 60))
}
