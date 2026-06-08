import type { MacroTotals } from '@/types'
import { emptyMacros } from './macros'

// Open Food Facts is a free, open packaged-food database (3M+ products, no API key).
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
// OFF asks API consumers to send a descriptive User-Agent.
const OFF_UA = 'NutriSync/1.0 (nutrition tracking app)'

export interface OffProduct {
  name: string
  defaultServingG: number
  caloriesPer100g: number
  macrosPer100g: MacroTotals
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Look up a packaged product by barcode. Returns reliable calories + macros per 100g.
 * Micronutrients from OFF are sparse and unit-inconsistent, so we leave those to a
 * Claude estimate at the route layer.
 */
export async function fetchProductByBarcode(barcode: string): Promise<OffProduct | null> {
  const code = barcode.replace(/\D/g, '')
  if (!code) return null

  const url = `${OFF_BASE}/${code}?fields=product_name,brands,nutriments,serving_quantity`
  const res = await fetch(url, {
    headers: { 'User-Agent': OFF_UA },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null

  const data = await res.json()
  if (data.status !== 1 || !data.product) return null

  const p = data.product
  const n = p.nutriments ?? {}

  const name = [p.product_name, p.brands?.split(',')[0]?.trim()]
    .filter(Boolean)
    .join(' · ') || `Product ${code}`

  // Prefer kcal; fall back to kJ → kcal
  const caloriesPer100g = n['energy-kcal_100g'] != null
    ? Math.round(num(n['energy-kcal_100g']))
    : Math.round(num(n['energy_100g']) / 4.184)

  const macrosPer100g: MacroTotals = {
    ...emptyMacros(),
    protein_g: num(n['proteins_100g']),
    carbs_g:   num(n['carbohydrates_100g']),
    fat_g:     num(n['fat_100g']),
    fiber_g:   num(n['fiber_100g']),
  }

  const servingQ = num(p.serving_quantity)
  const defaultServingG = servingQ > 0 ? Math.round(servingQ) : 100

  return { name, defaultServingG, caloriesPer100g, macrosPer100g }
}
