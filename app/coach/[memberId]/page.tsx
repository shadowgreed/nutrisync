import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assessClient } from '@/lib/copilot'
import { computeStreak } from '@/lib/streak'
import type { NutrientTotals } from '@/types'
import CoachMemberClient, { type CoachNote } from './CoachMemberClient'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

interface MemberProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  calorie_target: number | null
  privacy_mode: string | null
  coach_visible: boolean | null
}

export default async function CoachMemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Groups the caller coaches.
  const { data: coachRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('role', 'coach')
  const coachGroupIds = (coachRows ?? []).map(r => r.group_id as string)
  if (coachGroupIds.length === 0) notFound()

  // The member must belong to one of those groups.
  const { data: rel } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', memberId)
    .in('group_id', coachGroupIds)
    .limit(1)
    .maybeSingle()
  if (!rel) notFound()
  const groupId = rel.group_id as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, calorie_target, privacy_mode, coach_visible')
    .eq('id', memberId)
    .single<MemberProfile>()
  if (!profile) notFound()

  // Respect the member's opt-out.
  if (profile.privacy_mode === 'dark' || profile.coach_visible === false) notFound()

  const since = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const sevenDaysAgo = Date.now() - 7 * DAY_MS

  const [{ data: foods }, { data: acts }, { data: noteRows }] = await Promise.all([
    supabase.from('food_logs')
      .select('logged_at, total_calories, nutrient_totals')
      .eq('user_id', memberId).gte('logged_at', since),
    supabase.from('activity_logs')
      .select('logged_at, calories_burned')
      .eq('user_id', memberId).gte('logged_at', since),
    supabase.from('coach_client_notes')
      .select('id, body, created_at')
      .eq('coach_id', user.id).eq('member_id', memberId).eq('group_id', groupId)
      .order('created_at', { ascending: false }),
  ])

  const allFoods = (foods ?? []) as { logged_at: string; total_calories: number | null; nutrient_totals: NutrientTotals | null }[]
  const allActs = (acts ?? []) as { logged_at: string; calories_burned: number | null }[]

  const lastLoggedAt = allFoods.reduce<string | null>(
    (max, f) => (!max || f.logged_at > max ? f.logged_at : max), null)
  const streak = computeStreak(allFoods.map(f => f.logged_at))

  const weekFoods = allFoods
    .filter(f => new Date(f.logged_at).getTime() >= sevenDaysAgo)
    .map(f => ({ logged_at: f.logged_at, total_calories: f.total_calories ?? 0, nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals) }))
  const weekActs = allActs
    .filter(a => new Date(a.logged_at).getTime() >= sevenDaysAgo)
    .map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 }))

  const { attention, signals, report } = assessClient({
    foods: weekFoods, activities: weekActs,
    calorieTarget: profile.calorie_target ?? 2000, lastLoggedAt,
  })

  return (
    <CoachMemberClient
      member={{ id: profile.id, display_name: profile.display_name ?? 'Member', avatar_url: profile.avatar_url }}
      groupId={groupId}
      attention={attention}
      signals={signals}
      report={report}
      streak={streak}
      initialNotes={(noteRows ?? []) as CoachNote[]}
    />
  )
}
