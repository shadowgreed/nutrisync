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

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: logs }, { data: activities }, { data: membership }] = await Promise.all([
    supabase
      .from('food_logs')
      .select('logged_at, total_calories')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: true }),
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
  let pendingRequests: { id: string; user_id: string; display_name: string; avatar_url: string | null }[] = []
  if (isOwner && group) {
    const { data: reqs } = await supabase
      .from('group_join_requests')
      .select('id, user_id, profile:user_id(display_name, avatar_url)')
      .eq('group_id', group.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    pendingRequests = (reqs ?? []).map(r => {
      const p = r.profile as unknown as { display_name: string; avatar_url: string | null } | null
      return { id: r.id as string, user_id: r.user_id as string, display_name: p?.display_name ?? 'Someone', avatar_url: p?.avatar_url ?? null }
    })
  }

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ''}
      logs={logs ?? []}
      activities={activities ?? []}
      group={group}
      isOwner={isOwner}
      pendingRequests={pendingRequests}
    />
  )
}
