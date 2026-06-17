import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Activity history for the profile's History tab (charts now live on Trends).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: activities }, { data: membership }] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('logged_at, calories_burned, activity_name, duration_minutes, distance_km, steps')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false }),
    supabase
      .from('group_members')
      .select('group_id, groups(id, name, invite_code, created_by, photo_url)')
      .eq('user_id', user.id)
      .limit(1)
      .single(),
  ])

  const groupRow = (membership?.groups as unknown as
    { id: string; name: string; invite_code: string; created_by: string | null; photo_url: string | null } | null) ?? null
  const group = groupRow ? { ...groupRow, id: membership!.group_id as string } : null
  const isOwner = !!group && group.created_by === user.id

  // The founder also gets the list of pending join requests to approve/deny.
  // Via SECURITY DEFINER RPC: requesters aren't members yet, so their profiles
  // aren't readable under the scoped profiles policy (migration 025).
  let pendingRequests: { id: string; user_id: string; display_name: string; avatar_url: string | null }[] = []
  if (isOwner && group) {
    const { data: reqs } = await supabase.rpc('get_group_pending_requests', { p_group_id: group.id })
    pendingRequests = ((reqs ?? []) as { id: string; user_id: string; display_name: string | null; avatar_url: string | null }[])
      .map(r => ({ id: r.id, user_id: r.user_id, display_name: r.display_name ?? 'Someone', avatar_url: r.avatar_url }))
  }

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ''}
      activities={activities ?? []}
      group={group}
      isOwner={isOwner}
      pendingRequests={pendingRequests}
    />
  )
}
