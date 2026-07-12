import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'
import { rankFoods, rankMeals, type QuickLogSourceRow } from '@/lib/quick-log'
import type { MealType } from '@/types'

// Read-only endpoint: ranks the caller's own recent food_logs into quick-log
// suggestions. Saving still goes through POST /api/log-meal — this route never
// writes anything.

const WINDOW_DAYS = 60
const MAX_ROWS = 500
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mealParam = req.nextUrl.searchParams.get('meal') ?? ''
  const meal = (MEAL_TYPES as string[]).includes(mealParam) ? (mealParam as MealType) : null
  if (!meal) return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 })

  // Cheap read, but limits are one line (13 routes already use this pattern).
  if (!(await rateLimitDurable(supabase, `quick-log:${user.id}`, 30, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // One indexed query (user_id + logged_at, migration 044), bounded on both
  // time and row count. RLS-safe by construction: only the caller's own rows.
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('food_logs')
    .select('meal_type, logged_at, foods')
    .eq('user_id', user.id)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })
    .limit(MAX_ROWS)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as QuickLogSourceRow[]
  const res = NextResponse.json({
    foods: rankFoods(rows, meal),
    meals: rankMeals(rows, meal),
  })
  // Suggestions don't need to be fresher than 5 minutes (audit PR-44: almost
  // no route sets a cache header — this one should).
  res.headers.set('Cache-Control', 'private, max-age=300')
  return res
}
