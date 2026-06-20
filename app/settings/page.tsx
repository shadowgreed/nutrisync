import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

// Dedicated Settings hub (PRD Screen 3). Categorizes everything that used to be
// scattered across the profile. Real links where functionality exists today;
// not-yet-built areas are shown as disabled "Coming soon" rows.
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Plan label for the Subscription section.
  const { data: membership } = await supabase
    .from('group_members')
    .select('groups(plan)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const planRaw = (membership?.groups as unknown as { plan?: string } | null)?.plan
  const plan = planRaw === 'coach' ? 'Coach' : 'Free'

  return <SettingsClient email={user.email ?? ''} plan={plan} />
}
