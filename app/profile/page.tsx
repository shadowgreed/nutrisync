import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateMacroTargets } from '@/lib/macros'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Activity history for the profile's History tab (charts now live on Trends).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  // 48h windows for food + water so the client can filter to its own local
  // "today" (the server is UTC and doesn't know the viewer's timezone).
  const since48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // All in parallel — profile doesn't gate the other queries (one round trip).
  const [{ data: profile }, { data: activities }, { data: membership }, { data: foodLogs }, { data: waterLogs }] = await Promise.all([
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
    supabase
      .from('food_logs')
      .select('logged_at, total_calories, macro_totals')
      .eq('user_id', user.id)
      .gte('logged_at', since48),
    supabase
      .from('water_logs')
      .select('logged_at, amount_ml')
      .eq('user_id', user.id)
      .gte('logged_at', since48),
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

  // Macro targets (for the protein goal in the Goal & Progress card).
  const macroTargets = calculateMacroTargets(
    profile?.calorie_target ?? 2000,
    profile?.weight_kg ?? null,
    profile?.goal ?? null,
  )

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ''}
      activities={activities ?? []}
      group={group}
      foodLogs={(foodLogs ?? []) as { logged_at: string; total_calories: number | null; macro_totals: { protein_g?: number } | null }[]}
      waterLogs={(waterLogs ?? []) as { logged_at: string; amount_ml: number }[]}
      calorieTarget={profile?.calorie_target ?? null}
      proteinTarget={macroTargets.protein_g}
      waterTargetMl={profile?.water_daily_target_ml ?? 2500}
    />
  )
}
