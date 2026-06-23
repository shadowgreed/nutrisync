'use client'

import { useRouter } from 'next/navigation'
import { User, Mail, Bell, Shield, CreditCard, LifeBuoy, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SettingsShell, Section, LinkRow } from './_ui'

// Settings hub (PRD Screen 1). A clean navigation map — every setting has one
// home behind these rows. The only action that lives here is Log Out.
export default function SettingsClient({ email, plan }: { email: string; plan: string }) {
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <SettingsShell title="Settings" back="/profile">
      <Section title="Account">
        <LinkRow icon={<User size={16} />} label="Profile details" href="/profile/edit" />
        <LinkRow icon={<Mail size={16} />} label="Email" value={email} />
      </Section>

      <Section title="Preferences">
        <LinkRow icon={<Bell size={16} />} label="Notifications & reminders" href="/settings/notifications" />
      </Section>

      <Section title="Privacy">
        <LinkRow icon={<Shield size={16} />} label="Privacy" href="/settings/privacy" />
      </Section>

      <Section title="Plan">
        <LinkRow icon={<CreditCard size={16} />} label="Current plan" value={`${plan} plan`} href="/settings/subscription" />
      </Section>

      <Section title="Support">
        <LinkRow icon={<LifeBuoy size={16} />} label="Help & legal" href="/settings/support" />
      </Section>

      {/* Log Out — the final action on the hub (PRD) */}
      <div className="px-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </SettingsShell>
  )
}
