import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateMacroTargets } from '@/lib/macros'
import { computeStreak } from '@/lib/streak'
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

  // "Today" depends on the viewer's local timezone, which the server (UTC on
  // Vercel) doesn't know. So fetch a 48h window and let the client filter to its
  // own local day — otherwise the dashboard empties out every evening once UTC
  // rolls past midnight while it's still "today" for the user.
  const since48ISO = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Look back ~60 days for the logging-streak calculation
  const streakWindowISO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: logs }, { data: activities }, { data: waterLogs }, { data: streakRows }] = await Promise.all([
    // select('*') so a missing macro_totals column (pre-migration-007) doesn't break the read
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', since48ISO)
      .order('logged_at', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('calories_burned, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since48ISO),
    supabase
      .from('water_logs')
      .select('id, amount_ml, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since48ISO)
      .order('logged_at', { ascending: true }),
    supabase
      .from('food_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', streakWindowISO),
  ])

  const streak = computeStreak((streakRows ?? []).map(r => r.logged_at as string))

  // Macro targets derived from calorie target + goal + weight (Mifflin-based)
  const macroTargets = calculateMacroTargets(
    profile?.calorie_target ?? 2000,
    profile?.weight_kg ?? null,
    profile?.goal ?? null,
  )

  return (
    <DashboardClient
      logs={logs ?? []}
      activities={activities ?? []}
      displayName={profile?.display_name ?? 'there'}
      calorieTarget={profile?.calorie_target ?? null}
      streak={streak}
      macroTargets={macroTargets}
      waterTargetMl={profile?.water_daily_target_ml ?? 2500}
      waterBottleMl={profile?.water_bottle_ml ?? 500}
      initialWaterLogs={waterLogs ?? []}
    />
  )
}
