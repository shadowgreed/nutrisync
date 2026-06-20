import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Activity history for the profile's History tab (charts now live on Trends).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // All in parallel — profile doesn't gate the other queries (one round trip).
  const [{ data: profile }, { data: activities }, { data: membership }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('activity_logs')
      .select('logged_at, calories_burned, activity_name, duration_minutes, distance_km, steps')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false }),
    supabase
      .from('group_members')
      .select('group_id, groups(id, name, photo_url)')
      .eq('user_id', user.id)
      .limit(1)
      .single(),
  ])

  const groupRow = (membership?.groups as unknown as
    { id: string; name: string; photo_url: string | null } | null) ?? null

  // Read-only group summary for Profile: image, name, member count, coach name.
  // Management (invites/approvals/leave) now lives at /group/manage.
  let group: { id: string; name: string; photo_url: string | null; memberCount: number; coachName: string | null } | null = null
  if (groupRow) {
    const groupId = membership!.group_id as string
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('role, profiles(display_name)')
      .eq('group_id', groupId)
    const members = memberRows ?? []
    const coachRow = members.find(m => m.role === 'coach') ?? null
    const coachProfile = coachRow && coachRow.profiles && typeof coachRow.profiles === 'object' && !Array.isArray(coachRow.profiles)
      ? (coachRow.profiles as unknown as { display_name: string | null })
      : null
    group = {
      id: groupId,
      name: groupRow.name,
      photo_url: groupRow.photo_url,
      memberCount: members.length,
      coachName: coachProfile?.display_name ?? null,
    }
  }

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ''}
      activities={activities ?? []}
      group={group}
    />
  )
}
