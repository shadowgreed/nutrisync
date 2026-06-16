import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditProfileClient from './EditProfileClient'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Is this user a coach of any group? Controls whether the coach-voice setting shows.
  const { count: coachCount } = await supabase
    .from('group_members')
    .select('group_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'coach')

  return <EditProfileClient profile={profile} isCoach={(coachCount ?? 0) > 0} />
}
