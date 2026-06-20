import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditCard, Receipt, Crown } from 'lucide-react'
import { SettingsShell, Section, LinkRow } from '../_ui'

// Billing & plan management (PRD Screen 5). Billing/upgrade are gated until
// Stripe is wired; the plan label reflects the user's group plan.
export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('group_members')
    .select('groups(plan)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const planRaw = (membership?.groups as unknown as { plan?: string } | null)?.plan
  const plan = planRaw === 'coach' ? 'Coach' : 'Free'

  return (
    <SettingsShell title="Subscription">
      <Section title="Current plan">
        <LinkRow icon={<CreditCard size={16} />} label="Plan" value={`${plan} plan`} />
      </Section>
      <Section title="Billing">
        <LinkRow icon={<Receipt size={16} />} label="Billing history" soon />
      </Section>
      <Section title="Upgrade">
        <LinkRow icon={<Crown size={16} />} label="Upgrade to Coach plan" soon />
      </Section>
    </SettingsShell>
  )
}
