import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'
import { analyzeFoodPhoto } from '@/lib/anthropic'
import { emptyTotals, sumTotals } from '@/lib/nutrients'
import { emptyMacros, sumMacros } from '@/lib/macros'
import type { FoodEntry } from '@/types'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024 // 8 MB

export async function POST(req: NextRequest) {
  // This route spends real Anthropic credits — require a session (don't rely on
  // the middleware redirect alone) and rate-limit per user.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await rateLimitDurable(supabase, `analyze:${user.id}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Too many photo analyses — try again in a bit.' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('photo') as File | null
    if (!file) return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are accepted' }, { status: 415 })
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Photo too large (max 8 MB)' }, { status: 413 })
    }

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
