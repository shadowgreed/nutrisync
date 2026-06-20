import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrivacyClient from './PrivacyClient'

// Single home for privacy + data controls (PRD Screen 4): profile visibility,
// feed visibility, data export, and account deletion. Privacy Policy is NOT here
// (it's informational/legal — it lives under Support).
export default async function PrivacySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_mode')
    .eq('id', user.id)
    .single<{ privacy_mode: string | null }>()

  return <PrivacyClient initialPrivacyMode={profile?.privacy_mode ?? 'full'} />
}
