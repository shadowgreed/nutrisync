import type { MacroTotals, MacroKey, MacroTargets, Goal } from '@/types'

export const MACRO_META: Record<MacroKey, {
  label: string
  short: string
  unit: string
  emoji: string
  color: string        // tailwind bg color for bars/rings
  caloriesPerGram: number
}> = {
  protein_g: { label: 'Protein', short: 'P', unit: 'g', emoji: '🥩', color: 'bg-rose-500',    caloriesPerGram: 4 },
  carbs_g:   { label: 'Carbs',   short: 'C', unit: 'g', emoji: '🍞', color: 'bg-amber-500',   caloriesPerGram: 4 },
  fat_g:     { label: 'Fat',     short: 'F', unit: 'g', emoji: '🥑', color: 'bg-yellow-400',  caloriesPerGram: 9 },
  fiber_g:   { label: 'Fiber',   short: 'Fb', unit: 'g', emoji: '🌾', color: 'bg-emerald-500', caloriesPerGram: 0 },
}

export const MACRO_KEYS = Object.keys(MACRO_META) as MacroKey[]

export function emptyMacros(): MacroTotals {
  return { protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
}

export function sumMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    protein_g: (a.protein_g || 0) + (b.protein_g || 0),
    carbs_g:   (a.carbs_g || 0)   + (b.carbs_g || 0),
    fat_g:     (a.fat_g || 0)     + (b.fat_g || 0),
    fiber_g:   (a.fiber_g || 0)   + (b.fiber_g || 0),
  }
}

export function scaleMacros(per100g: MacroTotals, servingG: number): MacroTotals {
  const s = servingG / 100
  return {
    protein_g: (per100g.protein_g || 0) * s,
    carbs_g:   (per100g.carbs_g || 0)   * s,
    fat_g:     (per100g.fat_g || 0)     * s,
    fiber_g:   (per100g.fiber_g || 0)   * s,
  }
}

/**
 * Derive daily macro targets from a calorie target, body weight and goal.
 * - Protein: g/kg of bodyweight (higher for cut/build), capped to a sane range.
 * - Fat: ~27.5% of calories.
 * - Carbs: remaining calories.
 * - Fiber: 14 g per 1000 kcal (Dietary Guidelines).
 */
export function calculateMacroTargets(
  calorieTarget: number,
  weightKg: number | null,
  goal: Goal | null,
): MacroTargets {
  const cals = Math.max(1000, calorieTarget || 2000)
  const weight = weightKg && weightKg > 0 ? weightKg : 70

  const proteinPerKg =
    goal === 'build_muscle' ? 2.0 :
    goal === 'lose_weight'  ? 1.8 :
    1.4 // maintain / improve_health / null

  const protein_g = Math.round(weight * proteinPerKg)
  const fat_g = Math.round((cals * 0.275) / 9)

  const proteinCals = protein_g * 4
  const fatCals = fat_g * 9
  const carbs_g = Math.max(0, Math.round((cals - proteinCals - fatCals) / 4))

  const fiber_g = Math.round((cals / 1000) * 14)

  return { calories: cals, protein_g, carbs_g, fat_g, fiber_g }
}

/** Percent of a macro target met (clamped 0–100 for bar widths). */
export function macroPct(current: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
}
