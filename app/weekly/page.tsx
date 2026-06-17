import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildWeeklyReport } from '@/lib/weekly'
import WeeklyReportClient from '@/components/WeeklyReportClient'

export default async function WeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: profile }, { data: foods }, { data: activities }, { data: waters }] = await Promise.all([
    supabase.from('profiles').select('calorie_target, water_daily_target_ml').eq('id', user.id).single(),
    supabase
      .from('food_logs')
      .select('logged_at, total_calories, nutrient_totals')
      .eq('user_id', user.id)
      .gte('logged_at', sinceISO),
    supabase
      .from('activity_logs')
      .select('logged_at, calories_burned')
      .eq('user_id', user.id)
      .gte('logged_at', sinceISO),
    supabase
      .from('water_logs')
      .select('logged_at, amount_ml')
      .eq('user_id', user.id)
      .gte('logged_at', sinceISO),
  ])

  const report = buildWeeklyReport({
    foods: foods ?? [],
    activities: activities ?? [],
    calorieTarget: profile?.calorie_target ?? 2000,
    water: waters ?? [],
    waterTargetMl: profile?.water_daily_target_ml ?? 2500,
  })

  return <WeeklyReportClient report={report} />
}
