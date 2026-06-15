import type { SupabaseClient } from '@supabase/supabase-js'

// True when `founderId` created a group that `memberId` belongs to — i.e. the
// founder has moderation authority over that member's posts. Call with an admin
// (service-role) client so the lookups bypass RLS. SERVER-ONLY.
export async function founderSharesGroupWith(
  admin: SupabaseClient,
  founderId: string,
  memberId: string,
): Promise<boolean> {
  const { data: founded } = await admin.from('groups').select('id').eq('created_by', founderId)
  const groupIds = (founded ?? []).map(g => g.id as string)
  if (!groupIds.length) return false

  const { data: shared } = await admin
    .from('group_members')
    .select('group_id')
    .eq('user_id', memberId)
    .in('group_id', groupIds)
    .limit(1)
  return !!(shared && shared.length)
}
