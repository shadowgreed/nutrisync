import type { NutrientTotals, MacroTotals, USDAFood } from '@/types'
import { emptyTotals } from './nutrients'
import { emptyMacros } from './macros'

// USDA macronutrient IDs (all in grams)
const MACRO_ID_MAP: Record<number, keyof MacroTotals> = {
  1003: 'protein_g', // Protein
  1005: 'carbs_g',   // Carbohydrate, by difference
  1004: 'fat_g',     // Total lipid (fat)
  1079: 'fiber_g',   // Fiber, total dietary
}

// USDA FoodData Central nutrient IDs
const NUTRIENT_ID_MAP: Record<number, keyof NutrientTotals> = {
  1114: 'vitamin_d',  // Vitamin D (D2 + D3), mcg
  1162: 'vitamin_c',  // Vitamin C, mg
  1178: 'b12',        // Vitamin B-12, mcg
  1089: 'iron',       // Iron, Fe, mg
  1087: 'calcium',    // Calcium, Ca, mg
  1090: 'magnesium',  // Magnesium, Mg, mg
  1095: 'zinc',       // Zinc, Zn, mg
  1092: 'potassium',  // Potassium, K, mg
  1177: 'folate',     // Folate, total, mcg
  // omega-3 components — summed into omega3 (mg)
  1279: 'omega3',     // ALA 18:3 n-3, g → converted to mg in mapper
  1280: 'omega3',     // EPA 20:5 n-3, g → converted to mg
  1272: 'omega3',     // DHA 22:6 n-3, g → converted to mg
}

// Nutrient IDs whose USDA value is in grams (need ×1000 to get mg)
const GRAM_IDS = new Set([1279, 1280, 1272])

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1'
const API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY'

// The nutrient IDs we need — passed to the search API so USDA prioritises returning them
// (micros + omega-3 components + energy + macros: protein/carbs/fat/fiber)
const TRACKED_NUTRIENT_IDS = [1114, 1162, 1178, 1089, 1087, 1090, 1095, 1092, 1177, 1279, 1280, 1272, 1008, 1003, 1004, 1005, 1079]

export async function searchFoods(query: string, pageSize = 20): Promise<USDAFood[]> {
  const params = new URLSearchParams({
    query,
    dataType: 'Foundation,SR Legacy,Survey (FNDDS)',
    pageSize: String(pageSize),
    api_key: API_KEY,
  })
  // Ask USDA to include our specific nutrients in abridged results
  for (const id of TRACKED_NUTRIENT_IDS) {
    params.append('nutrients', String(id))
  }
  const res = await fetch(`${BASE_URL}/foods/search?${params}`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`)
  const data = await res.json()
  return data.foods ?? []
}

export async function getFoodById(fdcId: number): Promise<USDAFood | null> {
  const res = await fetch(`${BASE_URL}/food/${fdcId}?api_key=${API_KEY}`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  return res.json()
}

export function mapUSDANutrients(food: USDAFood, servingSizeG: number): NutrientTotals {
  const totals = emptyTotals()
  const scale = servingSizeG / 100

  for (const n of food.foodNutrients) {
    const key = NUTRIENT_ID_MAP[n.nutrientId]
    if (!key) continue
    const raw = n.value * scale
    const value = GRAM_IDS.has(n.nutrientId) ? raw * 1000 : raw
    totals[key] = (totals[key] || 0) + value
  }

  return totals
}

export function mapMacros(food: USDAFood, servingSizeG: number): MacroTotals {
  const totals = emptyMacros()
  const scale = servingSizeG / 100
  for (const n of food.foodNutrients) {
    const key = MACRO_ID_MAP[n.nutrientId]
    if (!key) continue
    totals[key] = (totals[key] || 0) + n.value * scale
  }
  return totals
}

// USDA nutrient ID 1008 = Energy (kcal)
export function extractCalories(food: USDAFood, servingSizeG: number): number {
  const scale = servingSizeG / 100
  const energyNutrient = food.foodNutrients.find(n => n.nutrientId === 1008)
  return Math.round((energyNutrient?.value ?? 0) * scale)
}

// Format a food result for the search dropdown
export function formatFoodResult(food: USDAFood) {
  return {
    fdcId: String(food.fdcId),
    name: food.description,
    defaultServingG: food.servingSize ?? 100,
    servingUnit: food.servingSizeUnit ?? 'g',
  }
}
