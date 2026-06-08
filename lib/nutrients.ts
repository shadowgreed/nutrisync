import type { NutrientKey, NutrientTotals, NutrientStatus, GapCorrection, FoodFix } from '@/types'

export const NUTRIENT_META: Record<NutrientKey, {
  label: string
  unit: string
  target: number
  emoji: string
}> = {
  vitamin_d:  { label: 'Vitamin D',  unit: 'mcg', target: 20,   emoji: '☀️' },
  vitamin_c:  { label: 'Vitamin C',  unit: 'mg',  target: 90,   emoji: '🍊' },
  b12:        { label: 'Vitamin B12',unit: 'mcg', target: 2.4,  emoji: '🥩' },
  iron:       { label: 'Iron',       unit: 'mg',  target: 18,   emoji: '🫀' },
  calcium:    { label: 'Calcium',    unit: 'mg',  target: 1000, emoji: '🦷' },
  magnesium:  { label: 'Magnesium',  unit: 'mg',  target: 400,  emoji: '🌿' },
  zinc:       { label: 'Zinc',       unit: 'mg',  target: 11,   emoji: '⚡' },
  potassium:  { label: 'Potassium',  unit: 'mg',  target: 4700, emoji: '🍌' },
  omega3:     { label: 'Omega-3',    unit: 'mg',  target: 1600, emoji: '🐟' },
  folate:     { label: 'Folate',     unit: 'mcg', target: 400,  emoji: '🥬' },
}

export const NUTRIENT_KEYS = Object.keys(NUTRIENT_META) as NutrientKey[]

export function emptyTotals(): NutrientTotals {
  return { vitamin_d: 0, vitamin_c: 0, b12: 0, iron: 0, calcium: 0,
           magnesium: 0, zinc: 0, potassium: 0, omega3: 0, folate: 0 }
}

export function sumTotals(a: NutrientTotals, b: NutrientTotals): NutrientTotals {
  const result = {} as NutrientTotals
  for (const k of NUTRIENT_KEYS) result[k] = (a[k] || 0) + (b[k] || 0)
  return result
}

export function nutrientStatus(current: number, target: number): NutrientStatus {
  const pct = target > 0 ? current / target : 1
  if (pct >= 1) return 'green'
  if (pct >= 0.5) return 'yellow'
  return 'red'
}

export function pctMet(current: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
}

// Whole-food corrections for each Tier-1 nutrient.
// servingSizeG is what one "realistic serving" weighs.
// nutrientPer100g is how much of the nutrient is in 100g of the food.
const FOOD_FIXES: Record<NutrientKey, Array<{ name: string; serving: string; servingSizeG: number; nutrientPer100g: number }>> = {
  vitamin_d: [
    { name: 'Canned salmon', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 14.1 },
    { name: 'Egg yolk', serving: '2 large yolks', servingSizeG: 34, nutrientPer100g: 5.4 },
    { name: 'Fortified whole milk', serving: '1 cup (240ml)', servingSizeG: 240, nutrientPer100g: 1.2 },
  ],
  vitamin_c: [
    { name: 'Red bell pepper', serving: '½ cup chopped', servingSizeG: 75, nutrientPer100g: 128 },
    { name: 'Kiwi', serving: '1 medium', servingSizeG: 76, nutrientPer100g: 93 },
    { name: 'Strawberries', serving: '1 cup', servingSizeG: 152, nutrientPer100g: 59 },
  ],
  b12: [
    { name: 'Beef liver', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 70.7 },
    { name: 'Canned tuna', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 2.5 },
    { name: 'Greek yogurt', serving: '1 cup', servingSizeG: 245, nutrientPer100g: 0.75 },
  ],
  iron: [
    { name: 'Cooked lentils', serving: '1 cup', servingSizeG: 198, nutrientPer100g: 3.3 },
    { name: 'Pumpkin seeds', serving: '1 oz (28g)', servingSizeG: 28, nutrientPer100g: 8.8 },
    { name: 'Dark chocolate 70%+', serving: '1 oz (28g)', servingSizeG: 28, nutrientPer100g: 11.9 },
  ],
  calcium: [
    { name: 'Plain yogurt', serving: '1 cup', servingSizeG: 245, nutrientPer100g: 183 },
    { name: 'Cooked kale', serving: '1 cup', servingSizeG: 130, nutrientPer100g: 150 },
    { name: 'Sardines with bones', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 383 },
  ],
  magnesium: [
    { name: 'Pumpkin seeds', serving: '1 oz (28g)', servingSizeG: 28, nutrientPer100g: 550 },
    { name: 'Cooked spinach', serving: '1 cup', servingSizeG: 180, nutrientPer100g: 87 },
    { name: 'Dark chocolate 70%+', serving: '1 oz (28g)', servingSizeG: 28, nutrientPer100g: 228 },
  ],
  zinc: [
    { name: 'Oysters', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 78.6 },
    { name: 'Beef (ground)', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 5.4 },
    { name: 'Hemp seeds', serving: '3 tbsp (30g)', servingSizeG: 30, nutrientPer100g: 9.9 },
  ],
  potassium: [
    { name: 'Cooked white beans', serving: '1 cup', servingSizeG: 179, nutrientPer100g: 561 },
    { name: 'Avocado', serving: '1 medium', servingSizeG: 150, nutrientPer100g: 485 },
    { name: 'Cooked sweet potato', serving: '1 medium', servingSizeG: 130, nutrientPer100g: 475 },
  ],
  omega3: [
    { name: 'Salmon (wild-caught)', serving: '3 oz (85g)', servingSizeG: 85, nutrientPer100g: 2260 },
    { name: 'Walnuts', serving: '1 oz (28g)', servingSizeG: 28, nutrientPer100g: 9080 },
    { name: 'Chia seeds', serving: '1 oz (28g)', servingSizeG: 28, nutrientPer100g: 17800 },
  ],
  folate: [
    { name: 'Cooked edamame', serving: '1 cup', servingSizeG: 155, nutrientPer100g: 303 },
    { name: 'Cooked lentils', serving: '1 cup', servingSizeG: 198, nutrientPer100g: 181 },
    { name: 'Romaine lettuce', serving: '2 cups', servingSizeG: 94, nutrientPer100g: 136 },
  ],
}

// Whole-food suggestions for a single nutrient (used by weekly coaching)
export function foodFixesFor(key: NutrientKey): Array<{ name: string; serving: string }> {
  return FOOD_FIXES[key].map(f => ({ name: f.name, serving: f.serving }))
}

export function buildGapCorrections(
  totals: NutrientTotals,
): GapCorrection[] {
  return NUTRIENT_KEYS.map((key) => {
    const meta = NUTRIENT_META[key]
    const current = totals[key] || 0
    const target = meta.target
    const pct = pctMet(current, target)
    const status = nutrientStatus(current, target)
    const gap = Math.max(0, target - current)

    const fixes: FoodFix[] = FOOD_FIXES[key].map((f) => {
      const nutrientFromServing = (f.nutrientPer100g / 100) * f.servingSizeG
      const pctGapClosed = gap > 0 ? Math.round((nutrientFromServing / gap) * 100) : 0
      return { name: f.name, serving: f.serving, pctGapClosed }
    })

    return {
      nutrient: key,
      label: meta.label,
      unit: meta.unit,
      current,
      target,
      pctMet: pct,
      status,
      fixes,
    }
  }).sort((a, b) => a.pctMet - b.pctMet) // reds first
}
