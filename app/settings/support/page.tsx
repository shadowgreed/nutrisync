import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HelpCircle, MessageCircle, FileText, Shield, Info } from 'lucide-react'
import { SettingsShell, Section, LinkRow } from '../_ui'

const APP_VERSION = '0.1.0'

// Help + legal + app info (PRD Screen 7). This is the SINGLE home for Terms and
// Privacy Policy — they live nowhere else in the app's settings.
export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <SettingsShell title="Support">
      <Section title="Support">
        <LinkRow icon={<HelpCircle size={16} />} label="Help center" href="/help" />
        <LinkRow icon={<MessageCircle size={16} />} label="Contact support" soon />
        <LinkRow icon={<Info size={16} />} label="About us" href="/about" />
      </Section>
      <Section title="Legal">
        <LinkRow icon={<FileText size={16} />} label="Terms of Service" href="/terms" />
        <LinkRow icon={<Shield size={16} />} label="Privacy Policy" href="/privacy" />
      </Section>
      <Section title="App info">
        <LinkRow icon={<Info size={16} />} label="App version" value={`v${APP_VERSION}`} />
      </Section>
    </SettingsShell>
  )
}
