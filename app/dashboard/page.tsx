import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateMacroTargets } from '@/lib/macros'
import { computeStreak } from '@/lib/streak'
import { buildDailySeries } from '@/lib/trends'
import { weeklyCoaching } from '@/lib/coaching'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, calorie_target, onboarding_done, water_bottle_ml, water_daily_target_ml, weight_kg, goal')
    .eq('id', user.id)
    .single()

  if (profile && profile.onboarding_done === false) {
    redirect('/onboarding')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // Look back ~60 days for the logging-streak calculation
  const streakWindow = new Date(today)
  streakWindow.setDate(streakWindow.getDate() - 60)
  const streakWindowISO = streakWindow.toISOString()

  // Last 7 days for weekly micronutrient coaching
  const weekWindow = new Date(today)
  weekWindow.setDate(weekWindow.getDate() - 6)
  const weekWindowISO = weekWindow.toISOString()

  const [{ data: logs }, { data: activities }, { data: waterLogs }, { data: streakRows }, { data: weekLogs }] = await Promise.all([
    // select('*') so a missing macro_totals column (pre-migration-007) doesn't break the read
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', todayISO)
      .order('logged_at', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('calories_burned')
      .eq('user_id', user.id)
      .gte('logged_at', todayISO),
    supabase
      .from('water_logs')
      .select('id, amount_ml')
      .eq('user_id', user.id)
      .gte('logged_at', todayISO)
      .order('logged_at', { ascending: true }),
    supabase
      .from('food_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', streakWindowISO),
    supabase
      .from('food_logs')
      .select('logged_at, total_calories, nutrient_totals')
      .eq('user_id', user.id)
      .gte('logged_at', weekWindowISO),
  ])

  const caloriesBurnedToday = (activities ?? []).reduce((s, a) => s + (a.calories_burned || 0), 0)
  const waterTodayMl = (waterLogs ?? []).reduce((s, w) => s + (w.amount_ml || 0), 0)
  const streak = computeStreak((streakRows ?? []).map(r => r.logged_at as string))
  const coaching = weeklyCoaching(buildDailySeries(weekLogs ?? [], 7))

  // Macro targets derived from calorie target + goal + weight (Mifflin-based)
  const macroTargets = calculateMacroTargets(
    profile?.calorie_target ?? 2000,
    profile?.weight_kg ?? null,
    profile?.goal ?? null,
  )

  return (
    <DashboardClient
      logs={logs ?? []}
      displayName={profile?.display_name ?? 'there'}
      calorieTarget={profile?.calorie_target ?? null}
      caloriesBurnedToday={caloriesBurnedToday}
      streak={streak}
      coaching={coaching}
      macroTargets={macroTargets}
      waterTodayMl={waterTodayMl}
      waterTargetMl={profile?.water_daily_target_ml ?? 2500}
      waterBottleMl={profile?.water_bottle_ml ?? 500}
      initialWaterLogs={waterLogs ?? []}
    />
  )
}
