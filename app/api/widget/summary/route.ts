import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeStreak } from '@/lib/streak'
import { resolveTimeZone } from '@/lib/day'
import { buildWidgetSummary } from '@/lib/widget'

// Data contract for the native home-screen widget (iOS WidgetKit / Android
// Glance). The Capacitor app — which holds the Supabase session — polls this and
// writes the snapshot into the platform's shared container; the widget renders
// from that container offline. See docs/WIDGET-IMPLEMENTATION.md.
//
// Returns today's calories vs target, water vs target, and the logging streak,
// computed in the user's timezone so it matches the dashboard exactly.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Mirror the dashboard's windows: 48h of logs (filtered to the local day) and
  // ~60d for the streak.
  const since48ISO = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const streakWindowISO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: profile }, { data: foodLogs }, { data: waterLogs }, { data: streakRows }] = await Promise.all([
    supabase.from('profiles')
      .select('calorie_target, water_daily_target_ml, reminder_timezone')
      .eq('id', user.id).single(),
    supabase.from('food_logs')
      .select('total_calories, logged_at')
      .eq('user_id', user.id).gte('logged_at', since48ISO),
    supabase.from('water_logs')
      .select('amount_ml, logged_at')
      .eq('user_id', user.id).gte('logged_at', since48ISO),
    supabase.from('food_logs')
      .select('logged_at')
      .eq('user_id', user.id).gte('logged_at', streakWindowISO),
  ])

  const timeZone = resolveTimeZone(profile?.reminder_timezone as string | null)
  const streak = computeStreak((streakRows ?? []).map(r => r.logged_at as string), { timeZone })

  const summary = buildWidgetSummary({
    foodLogs: foodLogs ?? [],
    waterLogs: waterLogs ?? [],
    calorieTarget: (profile?.calorie_target as number | null) ?? null,
    waterTargetMl: (profile?.water_daily_target_ml as number | null) ?? 2500,
    streak,
    timeZone,
  })

  // Short private cache — the widget refreshes on its own cadence; this just
  // de-dupes bursts without serving another user's data.
  return NextResponse.json(summary, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
