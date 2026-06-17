import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateMacroTargets } from '@/lib/macros'
import { buildDailySeries } from '@/lib/trends'
import TrendsClient from './TrendsClient'

export default async function TrendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // select('*') tolerates a missing target_weight_kg column (pre-migration-014)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const since30 = new Date()
  since30.setHours(0, 0, 0, 0)
  since30.setDate(since30.getDate() - 29)

  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)

  const [{ data: logs }, weightRes, { data: activityRows }, { data: waterRows }] = await Promise.all([
    supabase
      .from('food_logs')
      .select('logged_at, total_calories, macro_totals, nutrient_totals')
      .eq('user_id', user.id)
      .gte('logged_at', since30.toISOString())
      .order('logged_at', { ascending: true }),
    // weight_logs may not exist yet (migration 008) — tolerate the error
    supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since90.toISOString())
      .order('logged_at', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('logged_at, calories_burned')
      .eq('user_id', user.id)
      .gte('logged_at', since30.toISOString()),
    supabase
      .from('water_logs')
      .select('logged_at, amount_ml')
      .eq('user_id', user.id)
      .gte('logged_at', since30.toISOString()),
  ])

  const series30 = buildDailySeries(logs ?? [], 30)
  const calorieTarget = profile?.calorie_target ?? null
  const macroTargets = calculateMacroTargets(
    profile?.calorie_target ?? 2000,
    profile?.weight_kg ?? null,
    profile?.goal ?? null,
  )

  const weightLogs = (weightRes.data ?? []).map(w => ({
    weight_kg: Number(w.weight_kg),
    logged_at: w.logged_at as string,
  }))

  return (
    <TrendsClient
      series30={series30}
      calorieTarget={calorieTarget}
      macroTargets={macroTargets}
      weightLogs={weightLogs}
      activities={(activityRows ?? []) as { logged_at: string; calories_burned: number }[]}
      waterLogs={(waterRows ?? []) as { logged_at: string; amount_ml: number }[]}
      waterTargetMl={profile?.water_daily_target_ml ?? 2500}
      currentWeightKg={profile?.weight_kg ?? null}
      targetWeightKg={profile?.target_weight_kg ?? null}
    />
  )
}
