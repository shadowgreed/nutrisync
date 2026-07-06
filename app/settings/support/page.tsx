import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HelpCircle, MessageCircle, FileText, Shield, Info } from 'lucide-react'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import { SettingsShell, Section, LinkRow } from '../_ui'

const APP_VERSION = '0.1.0'

// Help + legal + app info (PRD Screen 7). This is the SINGLE home for Terms and
// Privacy Policy — they live nowhere else in the app's settings.
export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const t = getDict(await getLocale())

  return (
    <SettingsShell title={t.settings.support} backAria={t.settings.backAria}>
      <Section title={t.settings.support}>
        <LinkRow icon={<HelpCircle size={16} />} label={t.settings.helpCenter} href="/help" />
        <LinkRow icon={<MessageCircle size={16} />} label={t.settings.contactSupport} href="mailto:hello@nutrisync.app?subject=NutriSync%20support" external />
        <LinkRow icon={<Info size={16} />} label={t.settings.aboutUs} href="/about" />
      </Section>
      <Section title={t.settings.legal}>
        <LinkRow icon={<FileText size={16} />} label={t.settings.termsOfService} href="/terms" />
        <LinkRow icon={<Shield size={16} />} label={t.settings.privacyPolicy} href="/privacy" />
      </Section>
      <Section title={t.settings.appInfo}>
        <LinkRow icon={<Info size={16} />} label={t.settings.appVersionLabel} value={t.settings.appVersion(APP_VERSION)} />
      </Section>
    </SettingsShell>
  )
}
