import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Activity, Watch } from 'lucide-react'
import { SettingsShell, Section, LinkRow } from '../_ui'

// Third-party connections (PRD Screen 6). None are wired yet — shown as the
// single home for integrations so they can be switched on without re-architecting.
export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <SettingsShell title="Integrations">
      <Section title="Health">
        <LinkRow icon={<Activity size={16} />} label="Apple Health" soon />
        <LinkRow icon={<Activity size={16} />} label="Google Health Connect" soon />
        <LinkRow icon={<Watch size={16} />} label="Wearables" soon />
      </Section>
      <Section title="Coming later">
        <LinkRow icon={<Watch size={16} />} label="Garmin" soon />
        <LinkRow icon={<Watch size={16} />} label="Fitbit" soon />
        <LinkRow icon={<Watch size={16} />} label="Oura" soon />
        <LinkRow icon={<Watch size={16} />} label="Whoop" soon />
      </Section>
    </SettingsShell>
  )
}
