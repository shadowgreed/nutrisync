import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Check } from 'lucide-react'
import { SettingsShell, Section } from '../_ui'

// Plan status. NutriSync is currently free for everyone — there are no in-app
// purchases, so no billing/upgrade/restore UI is shown (store compliance: never
// advertise a purchase flow that doesn't exist).
export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <SettingsShell title="Plan">
      <Section title="Your plan">
        <div className="px-4 py-4">
          <p className="text-white font-semibold flex items-center gap-2"><Check size={16} className="text-emerald-400" aria-hidden="true" /> NutriSync is free</p>
          <p className="text-stone-400 text-sm mt-1.5 leading-relaxed">
            Every feature — food logging, activity, hydration, groups, challenges, trends, and weekly reviews — is included at no cost. There are no in-app purchases.
          </p>
        </div>
      </Section>
    </SettingsShell>
  )
}
