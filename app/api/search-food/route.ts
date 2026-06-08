import { NextRequest, NextResponse } from 'next/server'
import { searchFoods, formatFoodResult, mapUSDANutrients, mapMacros, extractCalories } from '@/lib/usda'
import { estimateFoodNutrition } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ foods: [] })

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
