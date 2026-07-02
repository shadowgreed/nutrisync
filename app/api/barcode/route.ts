import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'
import { fetchProductByBarcode } from '@/lib/openfoodfacts'
import { estimateFoodNutrition } from '@/lib/anthropic'
import { MACRO_KEYS } from '@/lib/macros'
import type { MacroTotals } from '@/types'

function hasMacros(m: MacroTotals): boolean {
  return MACRO_KEYS.some(k => (m[k] ?? 0) > 0)
}

export async function GET(req: NextRequest) {
  // Each lookup can call Anthropic for micro estimates — auth + per-user limit.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await rateLimitDurable(supabase, `barcode:${user.id}`, 30, 60 * 1000))) {
    return NextResponse.json({ error: 'Too many scans — give it a moment.' }, { status: 429 })
  }

  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code || !/^\d{6,14}$/.test(code)) return NextResponse.json({ error: 'Missing or invalid barcode' }, { status: 400 })

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
