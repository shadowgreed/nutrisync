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
      .select('logged_at, calories_burned, activity_name, duration_minutes')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false }),
    supabase
      .from('group_members')
      .select('groups(name, invite_code)')
      .eq('user_id', user.id)
      .limit(1)
      .single(),
  ])

  const group = (membership?.groups as unknown as { name: string; invite_code: string } | null) ?? null

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ''}
      logs={logs ?? []}
      activities={activities ?? []}
      group={group}
    />
  )
}
