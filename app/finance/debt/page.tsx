import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanSettings, type FinanceAccountRow } from '@/lib/finance/data'
import { dbToCents } from '@/lib/finance/money'
import DebtClient from './DebtClient'

export default async function DebtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, settings] = await Promise.all([
    supabase
      .from('finance_accounts')
      .select('*')
      .eq('user_id', user.id),
    getPlanSettings(supabase, user.id),
  ])

  const accts = (accounts ?? []) as FinanceAccountRow[]
  const bufferCents = accts
    .filter(a => a.type === 'savings')
    .reduce((s, a) => s + dbToCents(a.current_balance), 0)

  return (
    <DebtClient
      creditAccounts={accts.filter(a => a.type === 'credit')}
      settings={settings}
      bufferStartCents={bufferCents}
    />
  )
}
