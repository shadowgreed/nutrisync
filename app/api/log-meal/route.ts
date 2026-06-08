import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sumTotals, emptyTotals } from '@/lib/nutrients'
import { sumMacros, emptyMacros } from '@/lib/macros'
import type { FoodEntry } from '@/types'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // RLS ("Users can delete own logs") also enforces ownership; the user_id filter is belt-and-suspenders
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { meal_type, foods, photo_url, privacy_override, caption } = body as {
    meal_type: string
    foods: FoodEntry[]
    photo_url?: string
    privacy_override?: string
    caption?: string
  }

  if (!meal_type || !foods?.length) {
    return NextResponse.json({ error: 'meal_type and foods are required' }, { status: 400 })
  }

  const nutrient_totals = foods.reduce(
    (acc: ReturnType<typeof emptyTotals>, f: FoodEntry) => sumTotals(acc, f.nutrients),
    emptyTotals(),
  )

  const macro_totals = foods.reduce(
    (acc: ReturnType<typeof emptyMacros>, f: FoodEntry) => sumMacros(acc, f.macros ?? emptyMacros()),
    emptyMacros(),
  )

  const total_calories = Math.round(foods.reduce((s, f) => s + (f.calories ?? 0), 0))

  const baseRow = {
    user_id: user.id,
    meal_type,
    foods,
    nutrient_totals,
    total_calories,
    photo_url: photo_url ?? null,
    privacy_override: privacy_override ?? null,
    caption: caption?.trim() || null,
  }

  // Try inserting with macro_totals; if migration 007 hasn't been applied yet,
  // Postgres/PostgREST reports the missing column (code PGRST204) — retry without it
  // so logging still works (calories + micros persist).
  let { data, error } = await supabase
    .from('food_logs')
    .insert({ ...baseRow, macro_totals })
    .select()
    .single()

  if (error && (error.code === 'PGRST204' || /macro_totals/.test(error.message))) {
    console.warn('macro_totals column missing — apply migration 007. Logging without macros for now.')
    ;({ data, error } = await supabase
      .from('food_logs')
      .insert(baseRow)
      .select()
      .single())
  }

  if (error) {
    console.error('log-meal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ log: data })
}
