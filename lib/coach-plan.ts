import type { SupabaseClient } from '@supabase/supabase-js'

// ── M4: Coach plan gating ─────────────────────────────────────────────────────
// The Copilot (drafting + daily digest) and the larger member cap are unlocked by
// a group's plan = 'coach'. A 'free' group's founder still sees the basic roster,
// but no AI drafting. This module is the single place plan is checked, so wiring
// real billing later (Stripe) is one integration point — see docs spec §9.

export const COACH_PLAN_MEMBER_CAP = 30
export const FREE_PLAN_MEMBER_CAP = 6

/** Is this group on the paid coach plan (Copilot unlocked)? */
export async function isCoachPlanGroup(supabase: SupabaseClient, groupId: string): Promise<boolean> {
  const { data } = await supabase.from('groups').select('plan').eq('id', groupId).maybeSingle()
  return data?.plan === 'coach'
}

/** Group ids where `userId` coaches AND the group is on the coach plan. */
export async function coachPlanGroupIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('group_members')
    .select('group_id, groups(plan)')
    .eq('user_id', userId)
    .eq('role', 'coach')
  return (data ?? [])
    .filter(r => (r.groups as unknown as { plan?: string } | null)?.plan === 'coach')
    .map(r => r.group_id as string)
}
