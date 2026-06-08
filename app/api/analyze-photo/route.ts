import { NextRequest, NextResponse } from 'next/server'
import { analyzeFoodPhoto } from '@/lib/anthropic'
import { emptyTotals, sumTotals } from '@/lib/nutrients'
import { emptyMacros, sumMacros } from '@/lib/macros'
import type { FoodEntry } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('photo') as File | null
    if (!file) return NextResponse.json({ error: 'No photo provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mediaType = file.type || 'image/jpeg'

    // Single Claude Vision call returns each food WITH complete nutrition.
    const analysis = await analyzeFoodPhoto(base64, mediaType)

    if (!analysis.foods.length) {
      return NextResponse.json({ error: 'No food detected in photo. Try a clearer shot.' }, { status: 422 })
    }

    const foodEntries: FoodEntry[] = analysis.foods.map((f) => ({
      fdcId: 'ai-vision',
      name: f.name,
      servingSizeG: f.servingSizeG,
      calories: f.calories,
      macros: f.macros,
      nutrients: f.nutrients,
    }))

    const totalNutrients = foodEntries.reduce(
      (acc, entry) => sumTotals(acc, entry.nutrients),
      emptyTotals(),
    )
    const totalMacros = foodEntries.reduce(
      (acc, entry) => sumMacros(acc, entry.macros),
      emptyMacros(),
    )

    return NextResponse.json({
      description: analysis.rawDescription,
      foods: foodEntries,
      nutrient_totals: totalNutrients,
      macro_totals: totalMacros,
    })
  } catch (err) {
    console.error('analyze-photo error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
