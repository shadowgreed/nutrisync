import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assessClient } from '@/lib/copilot'
import { computeStreak } from '@/lib/streak'
import { effectiveDiet, isDiet } from '@/lib/diets'
import type { NutrientTotals, Diet } from '@/types'
import CoachClient, { type CoachGroup, type RosterMember } from './CoachClient'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

interface GroupMeta { id: string; name: string; plan: 'free' | 'coach'; member_cap: number }
interface ProfileJoin {
  id: string
  display_name: string | null
  avatar_url: string | null
  calorie_target: number | null
  privacy_mode: string | null
  coach_visible: boolean | null
  diet: string | null
}
interface FoodRow { user_id: string; logged_at: string; total_calories: number | null; nutrient_totals: NutrientTotals | null }
interface ActivityRow { user_id: string; logged_at: string; calories_burned: number | null }

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('coach_style').eq('id', user.id).single()
  const coachStyle = (me?.coach_style as string | null) ?? null

  // Groups this user coaches.
  const { data: coachRows } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, plan, member_cap)')
    .eq('user_id', user.id)
    .eq('role', 'coach')

  const groupMeta: GroupMeta[] = (coachRows ?? [])
    .map(r => (r.groups as unknown as GroupMeta | null))
    .filter((g): g is GroupMeta => !!g)

  const emptyGroups: CoachGroup[] = []
  if (groupMeta.length === 0) {
    return <CoachClient groups={emptyGroups} members={[]} hiddenCount={0} pendingDrafts={0} coachId={user.id} coachStyle={coachStyle} />
  }

  const groupIds = groupMeta.map(g => g.id)

  // Pending Copilot drafts + members of those groups + this coach's diet overrides.
  const [{ count: pendingDrafts }, { data: memberRows }, { data: overrideRows }] = await Promise.all([
    supabase.from('coach_message_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id).eq('status', 'pending'),
    supabase.from('group_members')
      .select('user_id, group_id, profiles(id, display_name, avatar_url, calorie_target, privacy_mode, coach_visible, diet)')
      .in('group_id', groupIds)
      .neq('user_id', user.id),
    supabase.from('coach_client_settings')
      .select('member_id, diet_override')
      .eq('coach_id', user.id),
  ])

  const overrideByMember = new Map<string, Diet | null>()
  for (const o of overrideRows ?? []) {
    overrideByMember.set(o.member_id as string, isDiet(o.diet_override) ? (o.diet_override as Diet) : null)
  }

  const memberships = (memberRows ?? []).map(r => ({
    user_id: r.user_id as string,
    group_id: r.group_id as string,
    profile: r.profiles as unknown as ProfileJoin | null,
  })).filter(m => !!m.profile)

  // Member count per group (+1 for the coach, who is a member of their own group).
  const countByGroup = new Map<string, number>()
  for (const m of memberships) countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1)
  const groups: CoachGroup[] = groupMeta.map(g => ({
    id: g.id, name: g.name, plan: g.plan ?? 'free', memberCap: g.member_cap ?? 6,
    memberCount: (countByGroup.get(g.id) ?? 0) + 1,
  }))

  const memberIds = [...new Set(memberships.map(m => m.user_id))]
  if (memberIds.length === 0) {
    return <CoachClient groups={groups} members={[]} hiddenCount={0} pendingDrafts={pendingDrafts ?? 0} coachId={user.id} coachStyle={coachStyle} />
  }

  const since = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const sevenDaysAgo = Date.now() - 7 * DAY_MS

  const [{ data: foods }, { data: acts }] = await Promise.all([
    supabase.from('food_logs')
      .select('user_id, logged_at, total_calories, nutrient_totals')
      .in('user_id', memberIds).gte('logged_at', since),
    supabase.from('activity_logs')
      .select('user_id, logged_at, calories_burned')
      .in('user_id', memberIds).gte('logged_at', since),
  ])

  const foodsByUser = new Map<string, FoodRow[]>()
  for (const f of (foods ?? []) as FoodRow[]) {
    const arr = foodsByUser.get(f.user_id) ?? []; arr.push(f); foodsByUser.set(f.user_id, arr)
  }
  const actsByUser = new Map<string, ActivityRow[]>()
  for (const a of (acts ?? []) as ActivityRow[]) {
    const arr = actsByUser.get(a.user_id) ?? []; arr.push(a); actsByUser.set(a.user_id, arr)
  }

  let hiddenCount = 0
  const members: RosterMember[] = []

  for (const m of memberships) {
    const p = m.profile!
    if (p.privacy_mode === 'dark' || p.coach_visible === false) { hiddenCount++; continue }

    const userFoods = foodsByUser.get(m.user_id) ?? []
    const userActs = actsByUser.get(m.user_id) ?? []
    const lastLoggedAt = userFoods.reduce<string | null>(
      (max, f) => (!max || f.logged_at > max ? f.logged_at : max), null)
    const streak = computeStreak(userFoods.map(f => f.logged_at))

    const weekFoods = userFoods
      .filter(f => new Date(f.logged_at).getTime() >= sevenDaysAgo)
      .map(f => ({ logged_at: f.logged_at, total_calories: f.total_calories ?? 0, nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals) }))
    const weekActs = userActs
      .filter(a => new Date(a.logged_at).getTime() >= sevenDaysAgo)
      .map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 }))

    const diet = effectiveDiet(isDiet(p.diet) ? p.diet : null, overrideByMember.get(m.user_id) ?? null)
    const { attention, signals, report } = assessClient({
      foods: weekFoods, activities: weekActs,
      calorieTarget: p.calorie_target ?? 2000, lastLoggedAt, diet,
    })

    const topSignal = (signals.find(s => s.severity === 'warn') ?? signals[0])?.label ?? null

    members.push({
      user_id: m.user_id,
      group_id: m.group_id,
      display_name: p.display_name ?? 'Member',
      avatar_url: p.avatar_url,
      attention, streak,
      daysLogged: report.daysLogged,
      caloriesAvg: report.calories.avgPerDay,
      calorieTarget: report.calories.target,
      nutrientsOnTrack: report.nutrients.onTrack,
      nutrientsTotal: report.nutrients.total,
      topSignal,
    })
  }

  return (
    <CoachClient
      groups={groups} members={members} hiddenCount={hiddenCount}
      pendingDrafts={pendingDrafts ?? 0} coachId={user.id} coachStyle={coachStyle}
    />
  )
}
