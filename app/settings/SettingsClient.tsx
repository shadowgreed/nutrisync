'use client'

import { useRouter } from 'next/navigation'
import { User, Mail, Bell, Shield, CreditCard, LifeBuoy, LogOut, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/I18nProvider'
import { SettingsShell, Section, LinkRow } from './_ui'

// Settings hub (PRD Screen 1). A clean navigation map — every setting has one
// home behind these rows. The only action that lives here is Log Out.
export default function SettingsClient({ email, plan }: { email: string; plan: string }) {
  const router = useRouter()
  const { t } = useI18n()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <SettingsShell title={t.settings.title} back="/profile" backAria={t.settings.backAria}>
      <Section title={t.settings.account}>
        <LinkRow icon={<User size={16} />} label={t.settings.profileDetails} href="/profile/edit" />
        <LinkRow icon={<Mail size={16} />} label={t.settings.email} value={email} />
      </Section>

      <Section title={t.settings.preferences}>
        <LinkRow icon={<Bell size={16} />} label={t.settings.notifications} href="/settings/notifications" />
        <LinkRow icon={<Globe size={16} />} label={t.settings.language} href="/settings/language" />
      </Section>

      <Section title={t.settings.privacy}>
        <LinkRow icon={<Shield size={16} />} label={t.settings.privacy} href="/settings/privacy" />
      </Section>

      <Section title={t.settings.plan}>
        <LinkRow icon={<CreditCard size={16} />} label={t.settings.currentPlan} value={t.settings.planValue(plan)} href="/settings/subscription" />
      </Section>

      <Section title={t.settings.support}>
        <LinkRow icon={<LifeBuoy size={16} />} label={t.settings.helpLegal} href="/settings/support" />
      </Section>

      {/* Log Out — the final action on the hub (PRD) */}
      <div className="px-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <LogOut size={16} /> {t.settings.logOut}
        </button>
      </div>
    </SettingsShell>
  )
}
