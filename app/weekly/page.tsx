import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeStreak } from '@/lib/streak'
import { resolveTimeZone, isSunday } from '@/lib/day'
import { buildWeeklyReview, type GroupStanding, type ReviewFood, type WeeklyReviewStrings } from '@/lib/weekly-review'
import WeeklyReviewClient from '@/components/WeeklyReviewClient'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import type { Goal, NutrientKey } from '@/types'

const localDay = (ts: string) => new Date(ts).toLocaleDateString('en-CA')

export default async function WeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const t = getDict(locale)
  const dateLocale = locale === 'es' ? 'es-419' : 'en-US'
  const weeklyStrings: WeeklyReviewStrings = {
    ...t.weekly.gen,
    dateLocale,
    goalLabel: (g: Goal) => t.onboarding.goalLabels[g],
    nutrientLabel: (k: NutrientKey) => t.nutrients[k],
    foodFixName: (fname: string) => t.foodFixes[fname]?.name ?? fname,
  }

  // The weekly review is a Sunday-only ritual (it recaps the week that just
  // ended). Gate direct visits to Sunday in the user's timezone — the Trends CTA
  // is hidden on other days, but this guards a typed-in / bookmarked URL too.
  const { data: tzRow } = await supabase
    .from('profiles').select('reminder_timezone').eq('id', user.id).single()
  const tz = resolveTimeZone(tzRow?.reminder_timezone as string | null)
  if (!isSunday(tz)) redirect('/trends')

  const now = new Date().getTime()
  const weekISO = new Date(now - 7 * 86400000).toISOString()
  const sixtyISO = new Date(now - 60 * 86400000).toISOString()
  const ninetyISO = new Date(now - 90 * 86400000).toISOString()
  const weekAgoMs = now - 7 * 86400000

  const [{ data: profile }, { data: foods }, { data: activities }, { data: waters }, { data: weights }, { data: streakLogs }] =
    await Promise.all([
      supabase.from('profiles').select('display_name, calorie_target, water_daily_target_ml, goal, goals, weight_kg, target_weight_kg, reminder_timezone').eq('id', user.id).single(),
      supabase.from('food_logs').select('logged_at, total_calories, nutrient_totals, meal_type, foods').eq('user_id', user.id).gte('logged_at', weekISO),
      supabase.from('activity_logs').select('logged_at, calories_burned').eq('user_id', user.id).gte('logged_at', weekISO),
      supabase.from('water_logs').select('logged_at, amount_ml').eq('user_id', user.id).gte('logged_at', weekISO),
      supabase.from('weight_logs').select('logged_at, weight_kg').eq('user_id', user.id).gte('logged_at', ninetyISO).order('logged_at', { ascending: true }),
      supabase.from('food_logs').select('logged_at').eq('user_id', user.id).gte('logged_at', sixtyISO),
    ])

  const streak = computeStreak(((streakLogs ?? []) as { logged_at: string }[]).map(l => l.logged_at), { timeZone: tz })

  // ── Group standings (best-effort; only when the viewer shares a group) ──────
  let group: GroupStanding[] | null = null
  try {
    const { data: peerRows } = await supabase.rpc('get_my_group_member_ids')
    const peerIds = Array.isArray(peerRows)
      ? [...new Set((peerRows as unknown[]).map(r => (typeof r === 'string' ? r : (r as Record<string, string>)?.get_my_group_member_ids)).filter(Boolean))] as string[]
      : []
    if (peerIds.length >= 2) {
      const [{ data: profs }, { data: peerFood }, { data: peerActs }] = await Promise.all([
        supabase.from('profiles').select('id, display_name').in('id', peerIds),
        supabase.from('food_logs').select('user_id, logged_at').in('user_id', peerIds).gte('logged_at', sixtyISO),
        supabase.from('activity_logs').select('user_id, logged_at').in('user_id', peerIds).gte('logged_at', weekISO),
      ])
      const nameById = new Map((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name ?? t.weekly.memberFallback]))
      const foodByUser = new Map<string, string[]>()
      for (const f of (peerFood ?? []) as { user_id: string; logged_at: string }[]) {
        const arr = foodByUser.get(f.user_id) ?? []; arr.push(f.logged_at); foodByUser.set(f.user_id, arr)
      }
      const actDaysByUser = new Map<string, Set<string>>()
      for (const a of (peerActs ?? []) as { user_id: string; logged_at: string }[]) {
        const set = actDaysByUser.get(a.user_id) ?? new Set<string>(); set.add(localDay(a.logged_at)); actDaysByUser.set(a.user_id, set)
      }
      group = peerIds.map(id => {
        const logs = foodByUser.get(id) ?? []
        const weekDays = new Set(logs.filter(ts => new Date(ts).getTime() >= weekAgoMs).map(localDay))
        return {
          userId: id,
          name: nameById.get(id) ?? t.weekly.memberFallback,
          daysLogged: weekDays.size,
          activeDays: (actDaysByUser.get(id) ?? new Set()).size,
          streak: computeStreak(logs),
        }
      })
    }
  } catch { /* group slide is optional */ }

  const goals = (profile?.goals as Goal[] | null) ?? null
  const goal: Goal | null = (goals && goals[0]) ?? (profile?.goal as Goal | null) ?? null

  const review = buildWeeklyReview({
    foods: (foods ?? []) as ReviewFood[],
    activities: (activities ?? []) as { logged_at: string; calories_burned: number | null }[],
    waters: (waters ?? []) as { logged_at: string; amount_ml: number | null }[],
    weights: (weights ?? []) as { logged_at: string; weight_kg: number }[],
    calorieTarget: profile?.calorie_target ?? 2000,
    waterTargetMl: profile?.water_daily_target_ml ?? 2500,
    goal,
    currentWeightKg: (profile?.weight_kg as number) ?? null,
    targetWeightKg: (profile?.target_weight_kg as number) ?? null,
    streak,
    myUserId: user.id,
    group,
    timeZone: tz,
    strings: weeklyStrings,
  })

  // Seed a "weekly report" bell notification so the recap stays revisitable all
  // week, independent of the Sunday cron. Idempotent: only adds one if there
  // isn't already a weekly_report notification in the last 6 days (which also
  // covers any the cron created). RLS permits inserting your own notification.
  if (review.hasData) {
    try {
      const sixAgoISO = new Date(now - 6 * 86400000).toISOString()
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('type', 'weekly_report').gte('created_at', sixAgoISO)
      if (!count) {
        await supabase.from('notifications').insert({ user_id: user.id, type: 'weekly_report', data: {} })
      }
    } catch { /* a bell notification is best-effort — never block the recap */ }
  }

  return <WeeklyReviewClient review={review} name={profile?.display_name ?? t.weekly.youName} />
}
