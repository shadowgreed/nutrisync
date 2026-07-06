import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import ManageClient from './ManageClient'

// Dedicated Group Management screen (PRD Screen 2). Houses the controls that
// used to clutter Profile: group info, coach dashboard entry, invitations, and
// the danger zone. Profile now only shows a read-only Group Summary card.
export default async function GroupManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = getDict(await getLocale())

  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id, role, groups(id, name, invite_code, created_by, photo_url)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const groupRow = (membership?.groups as unknown as
    { id: string; name: string; invite_code: string; created_by: string | null; photo_url: string | null } | null) ?? null
  // No group → nothing to manage; send them to Profile where they can create/join.
  if (!groupRow) redirect('/profile')

  const group = { ...groupRow, id: membership!.group_id as string }
  const isOwner = group.created_by === user.id
  const isCoach = membership!.role === 'coach' || isOwner

  // Roster: member count + coach identity for the info header.
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('user_id, role, profiles(display_name, avatar_url)')
    .eq('group_id', group.id)

  const members = (memberRows ?? [])
  const memberCount = members.length
  const coachRow = members.find(m => m.role === 'coach') ?? null
  const coachProfile = coachRow && coachRow.profiles && typeof coachRow.profiles === 'object' && !Array.isArray(coachRow.profiles)
    ? (coachRow.profiles as unknown as { display_name: string | null; avatar_url: string | null })
    : null
  const coach = coachProfile
    ? { name: coachProfile.display_name ?? 'Coach', avatar_url: coachProfile.avatar_url }
    : null

  // Founder gets the list of pending join requests to approve/deny (SECURITY
  // DEFINER RPC — requesters aren't members yet, so their profiles aren't
  // readable under the scoped profiles policy).
  let pendingRequests: { id: string; user_id: string; display_name: string; avatar_url: string | null }[] = []
  if (isOwner) {
    const { data: reqs } = await supabase.rpc('get_group_pending_requests', { p_group_id: group.id })
    pendingRequests = ((reqs ?? []) as { id: string; user_id: string; display_name: string | null; avatar_url: string | null }[])
      .map(r => ({ id: r.id, user_id: r.user_id, display_name: r.display_name ?? t.notifications.someone, avatar_url: r.avatar_url }))
  }

  return (
    <ManageClient
      group={group}
      isOwner={isOwner}
      isCoach={isCoach}
      memberCount={memberCount}
      coach={coach}
      pendingRequests={pendingRequests}
    />
  )
}
