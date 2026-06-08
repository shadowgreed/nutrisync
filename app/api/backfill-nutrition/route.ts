import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateFoodNutrition } from '@/lib/anthropic'
import { emptyTotals, sumTotals } from '@/lib/nutrients'
import { emptyMacros, sumMacros } from '@/lib/macros'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch today's logs that still have zero calorie data (select('*') tolerates a
  // missing macro_totals column on pre-migration-007 databases)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('logged_at', today.toISOString())
    .eq('total_calories', 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!logs?.length) return NextResponse.json({ updated: 0 })

  let updated = 0
  let macrosColumnMissing = false
  for (const log of logs) {
    const foods = (log.foods ?? []) as Array<{ name: string; servingSizeG: number }>
    if (!foods.length) continue

    // Estimate nutrition for each food item via Claude
    const estimates = await Promise.all(
      foods.map(f => estimateFoodNutrition(f.name, f.servingSizeG ?? 100))
    )

    const nutrient_totals = estimates.reduce(
      (acc, e) => sumTotals(acc, e.nutrients),
      emptyTotals()
    )
    const macro_totals = estimates.reduce(
      (acc, e) => sumMacros(acc, e.macros),
      emptyMacros()
    )
    const total_calories = estimates.reduce((s, e) => s + e.calories, 0)

    let { error: updErr } = await supabase
      .from('food_logs')
      .update({ nutrient_totals, macro_totals, total_calories })
      .eq('id', log.id)

    // Retry without macros if migration 007 hasn't run
    if (updErr && (updErr.code === 'PGRST204' || /macro_totals/.test(updErr.message))) {
      macrosColumnMissing = true
      ;({ error: updErr } = await supabase
        .from('food_logs')
        .update({ nutrient_totals, total_calories })
        .eq('id', log.id))
    }

    if (!updErr) updated++
  }

  return NextResponse.json({ updated, macrosColumnMissing })
}
