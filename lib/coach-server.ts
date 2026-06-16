import type { SupabaseClient } from '@supabase/supabase-js'
import { assessClient, type ClientStatus } from './copilot'
import { computeStreak } from './streak'
import { isDiet } from './diets'
import type { NutrientTotals, Diet } from '@/types'

// Server-side helpers shared by the coach pages and API routes. All reads go
// through the caller's auth-scoped client, so RLS still applies — these helpers
// only encode the coach↔member relationship checks and the assessment pipeline.

const DAY_MS = 24 * 60 * 60 * 1000

/** Group ids where `userId` has the coach role. */
export async function coachGroupIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .eq('role', 'coach')
  return (data ?? []).map(r => r.group_id as string)
}

/** A group's plan ('free' | 'coach'); defaults to 'free' when unknown. */
export async function getGroupPlan(supabase: SupabaseClient, groupId: string): Promise<'free' | 'coach'> {
  const { data } = await supabase.from('groups').select('plan').eq('id', groupId).maybeSingle()
  return (data?.plan as 'free' | 'coach') ?? 'free'
}

/** A coach's diet override for one member, or null if none set. */
export async function getDietOverride(
  supabase: SupabaseClient, coachId: string, memberId: string,
): Promise<Diet | null> {
  const { data } = await supabase
    .from('coach_client_settings')
    .select('diet_override')
    .eq('coach_id', coachId).eq('member_id', memberId)
    .maybeSingle()
  return isDiet(data?.diet_override) ? data!.diet_override as Diet : null
}

/**
 * Returns the group id through which `coachId` coaches `memberId`, or null if
 * there is no such relationship (i.e. not the coach's client).
 */
export async function groupForCoachMember(
  supabase: SupabaseClient, coachId: string, memberId: string,
): Promise<string | null> {
  const groupIds = await coachGroupIds(supabase, coachId)
  if (groupIds.length === 0) return null
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', memberId)
    .in('group_id', groupIds)
    .limit(1)
    .maybeSingle()
  return data ? (data.group_id as string) : null
}

export interface MemberAssessment extends ClientStatus {
  streak: number
  lastLoggedAt: string | null
}

/**
 * Pull a member's recent logs and run the deterministic assessment. The caller
 * must already have verified it may view this member (see groupForCoachMember).
 */
export async function assessMember(
  supabase: SupabaseClient, memberId: string, calorieTarget: number, diet?: Diet | null,
): Promise<MemberAssessment> {
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const sevenDaysAgo = Date.now() - 7 * DAY_MS

  const [{ data: foods }, { data: acts }] = await Promise.all([
    supabase.from('food_logs')
      .select('logged_at, total_calories, nutrient_totals')
      .eq('user_id', memberId).gte('logged_at', since),
    supabase.from('activity_logs')
      .select('logged_at, calories_burned')
      .eq('user_id', memberId).gte('logged_at', since),
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

  const status = assessClient({ foods: weekFoods, activities: weekActs, calorieTarget, lastLoggedAt, diet })
  return { ...status, streak, lastLoggedAt }
}
