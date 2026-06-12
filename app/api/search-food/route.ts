import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/ratelimit'
import { searchFoods, formatFoodResult, mapUSDANutrients, mapMacros, extractCalories } from '@/lib/usda'
import { estimateFoodNutrition } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  // Costs USDA quota (and Anthropic credits on fallback) — auth + per-user limit.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!rateLimit(`search:${user.id}`, 40, 60 * 1000)) {
    return NextResponse.json({ error: 'Slow down a little — too many searches.' }, { status: 429 })
  }

  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ foods: [] })
  if (query.length > 80) return NextResponse.json({ error: 'Query too long' }, { status: 400 })

  try {
    const results = await searchFoods(query, 15)
    const foods = results.map(food => ({
      ...formatFoodResult(food),
      nutrientsPer100g: mapUSDANutrients(food, 100),
      macrosPer100g: mapMacros(food, 100),
      caloriesPer100g: extractCalories(food, 100),
    }))
    return NextResponse.json({ foods })
  } catch (err) {
    // USDA failed (rate-limited, network error) — return one Claude-estimated result
    console.warn('USDA search failed, using Claude fallback:', err)
    try {
      const estimate = await estimateFoodNutrition(query, 100)
      return NextResponse.json({
        foods: [{
          fdcId: 'estimated',
          name: query,
          defaultServingG: 100,
          servingUnit: 'g',
          nutrientsPer100g: estimate.nutrients,
          macrosPer100g: estimate.macros,
          caloriesPer100g: estimate.calories,
        }],
      })
    } catch {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
  }
}
