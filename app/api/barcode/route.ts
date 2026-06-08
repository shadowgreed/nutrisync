import { NextRequest, NextResponse } from 'next/server'
import { fetchProductByBarcode } from '@/lib/openfoodfacts'
import { estimateFoodNutrition } from '@/lib/anthropic'
import { MACRO_KEYS } from '@/lib/macros'
import type { MacroTotals } from '@/types'

function hasMacros(m: MacroTotals): boolean {
  return MACRO_KEYS.some(k => (m[k] ?? 0) > 0)
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })

  try {
    const product = await fetchProductByBarcode(code)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // OFF gives reliable calories/macros; estimate micros (and fill cal/macros if OFF was blank)
    const estimate = await estimateFoodNutrition(product.name, 100)

    const caloriesPer100g = product.caloriesPer100g > 0 ? product.caloriesPer100g : estimate.calories
    const macrosPer100g = hasMacros(product.macrosPer100g) ? product.macrosPer100g : estimate.macros

    return NextResponse.json({
      food: {
        fdcId: `off:${code}`,
        name: product.name,
        defaultServingG: product.defaultServingG,
        servingUnit: 'g',
        caloriesPer100g,
        macrosPer100g,
        nutrientsPer100g: estimate.nutrients,
      },
    })
  } catch (err) {
    console.error('barcode lookup error:', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
