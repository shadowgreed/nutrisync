import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { assessClient } from '@/lib/copilot'
import { computeStreak } from '@/lib/streak'
import { effectiveDiet, isDiet } from '@/lib/diets'
import { calculateMacroTargets } from '@/lib/macros'
import { resolveTimeZone, userDayKey } from '@/lib/day'
import { buildIntel, rollupMember, buildGroupIntel, type IntelFood, type IntelWater, type IntelActivity, type MemberRollup } from '@/lib/coach-intel'
import type { NutrientTotals, Diet, Goal } from '@/types'
import CoachClient, { type CoachGroup, type RosterMember } from './CoachClient'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

interface GroupMeta { id: string; name: string; plan: 'free' | 'coach'; member_cap: number }
interface ProfileJoin {
  id: string
  display_name: string | null
  avatar_url: string | null
  calorie_target: number | null
  weight_kg: number | null
  goal: string | null
  water_daily_target_ml: number | null
  privacy_mode: string | null
  coach_visible: boolean | null
  diet: string | null
}
interface FoodRow { user_id: string; logged_at: string; total_calories: number | null; macro_totals: { protein_g?: number } | null; nutrient_totals: NutrientTotals | null; meal_type: string | null }
interface ActivityRow { user_id: string; logged_at: string; calories_burned: number | null }
interface WaterRow { user_id: string; logged_at: string; amount_ml: number | null }

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
      .select('user_id, group_id, profiles(id, display_name, avatar_url, calorie_target, weight_kg, goal, water_daily_target_ml, privacy_mode, coach_visible, diet, reminder_timezone)')
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
  // "Today" is per-member: each log is bucketed in its owner's timezone, so the
  // overview count is right even when the roster spans timezones.
  const tzByUser = new Map(memberships.map(m => [
    m.user_id,
    resolveTimeZone((m.profile as { reminder_timezone?: string | null } | null)?.reminder_timezone),
  ]))
  const nowDate = new Date()

  const [{ data: foods }, { data: acts }, { data: waters }, { count: checkinsSent }] = await Promise.all([
    supabase.from('food_logs')
      .select('user_id, logged_at, total_calories, macro_totals, nutrient_totals, meal_type')
      .in('user_id', memberIds).gte('logged_at', since),
    supabase.from('activity_logs')
      .select('user_id, logged_at, calories_burned')
      .in('user_id', memberIds).gte('logged_at', since),
    supabase.from('water_logs')
      .select('user_id, logged_at, amount_ml')
      .in('user_id', memberIds).gte('logged_at', since),
    // Check-ins the coach has sent this week (for engagement + daily overview).
    supabase.from('coach_message_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', user.id).in('status', ['sent', 'edited_sent'])
      .gte('created_at', new Date(sevenDaysAgo).toISOString()),
  ])

  const foodsByUser = new Map<string, FoodRow[]>()
  for (const f of (foods ?? []) as FoodRow[]) {
    const arr = foodsByUser.get(f.user_id) ?? []; arr.push(f); foodsByUser.set(f.user_id, arr)
  }
  const actsByUser = new Map<string, ActivityRow[]>()
  for (const a of (acts ?? []) as ActivityRow[]) {
    const arr = actsByUser.get(a.user_id) ?? []; arr.push(a); actsByUser.set(a.user_id, arr)
  }
  const watersByUser = new Map<string, WaterRow[]>()
  for (const w of (waters ?? []) as WaterRow[]) {
    const arr = watersByUser.get(w.user_id) ?? []; arr.push(w); watersByUser.set(w.user_id, arr)
  }
  const mealsToday = ((foods ?? []) as FoodRow[]).filter(f => {
    const tz = tzByUser.get(f.user_id)
    return tz ? userDayKey(f.logged_at, tz) === userDayKey(nowDate, tz) : false
  }).length

  let hiddenCount = 0
  const members: RosterMember[] = []
  const rollups: MemberRollup[] = []

  for (const m of memberships) {
    const p = m.profile!
    if (p.privacy_mode === 'dark' || p.coach_visible === false) { hiddenCount++; continue }
    const memberTz = resolveTimeZone((p as { reminder_timezone?: string | null }).reminder_timezone)

    const userFoods = foodsByUser.get(m.user_id) ?? []
    const userActs = actsByUser.get(m.user_id) ?? []
    const userWater = watersByUser.get(m.user_id) ?? []
    const lastLoggedAt = userFoods.reduce<string | null>(
      (max, f) => (!max || f.logged_at > max ? f.logged_at : max), null)
    const streak = computeStreak(userFoods.map(f => f.logged_at), { timeZone: memberTz })
    const daysSinceLog = lastLoggedAt
      ? Math.floor((Date.now() - new Date(lastLoggedAt).getTime()) / DAY_MS) : null

    const diet = effectiveDiet(isDiet(p.diet) ? p.diet : null, overrideByMember.get(m.user_id) ?? null)
    const proteinTarget = calculateMacroTargets(p.calorie_target ?? 2000, p.weight_kg, (p.goal as Goal | null) ?? null).protein_g

    const intel = buildIntel({
      name: p.display_name ?? 'Member',
      goal: p.goal,
      foods: userFoods.map(f => ({
        logged_at: f.logged_at, total_calories: f.total_calories ?? 0,
        protein_g: f.macro_totals?.protein_g ?? 0,
        nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals), meal_type: f.meal_type,
      })) as IntelFood[],
      water: userWater.map(w => ({ logged_at: w.logged_at, amount_ml: w.amount_ml ?? 0 })) as IntelWater[],
      activities: userActs.map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 })) as IntelActivity[],
      hasWeight: false,
      calorieTarget: p.calorie_target ?? 2000,
      proteinTarget,
      waterTargetMl: p.water_daily_target_ml ?? 2500,
      timeZone: memberTz,
    })
    const rollup = rollupMember(intel, daysSinceLog)
    rollups.push(rollup)

    // Keep assessClient for the legacy attention field (roster colour dot fallback).
    const week = sevenDaysAgo
    const { attention } = assessClient({
      foods: userFoods.filter(f => new Date(f.logged_at).getTime() >= week)
        .map(f => ({ logged_at: f.logged_at, total_calories: f.total_calories ?? 0, nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals) })),
      activities: userActs.filter(a => new Date(a.logged_at).getTime() >= week)
        .map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 })),
      calorieTarget: p.calorie_target ?? 2000, lastLoggedAt, diet, timeZone: memberTz,
    })

    members.push({
      user_id: m.user_id,
      group_id: m.group_id,
      display_name: p.display_name ?? 'Member',
      avatar_url: p.avatar_url,
      attention, streak,
      daysLogged: intel.daysLogged,
      caloriesAvg: intel.compliance.find(c => c.key === 'calories')?.pct ?? 0,
      calorieTarget: p.calorie_target ?? 2000,
      nutrientsOnTrack: 0,
      nutrientsTotal: 0,
      topSignal: rollup.primaryIssue,
      severity: rollup.severity,
      priority: rollup.priority,
      primaryIssue: rollup.primaryIssue,
    })
  }

  // Review-queue order: highest priority first, then longest streak.
  members.sort((a, b) => b.priority - a.priority || b.streak - a.streak)

  const group = buildGroupIntel(rollups, { checkinsSent: checkinsSent ?? 0 })

  return (
    <CoachClient
      groups={groups} members={members} hiddenCount={hiddenCount}
      pendingDrafts={pendingDrafts ?? 0} coachId={user.id} coachStyle={coachStyle}
      group={group} mealsToday={mealsToday} checkinsSent={checkinsSent ?? 0}
    />
  )
}
