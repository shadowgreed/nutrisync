import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CategoryRow, FinanceAccountRow, FinanceTransactionRow } from '@/lib/finance/data'
import TransactionsClient from './TransactionsClient'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 12 months back covers every month the filter offers.
  const since = new Date()
  since.setMonth(since.getMonth() - 12)
  const sinceDate = since.toISOString().slice(0, 10)

  const [{ data: transactions }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase
      .from('finance_transactions')
      .select('id, account_id, date, description, amount, category, subcategory, is_recurring, source')
      .eq('user_id', user.id)
      .gte('date', sinceDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('finance_categories')
      .select('id, name, parent')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('finance_accounts')
      .select('id, name, type')
      .eq('user_id', user.id)
      .order('name'),
  ])

  return (
    <TransactionsClient
      initialTransactions={(transactions ?? []) as FinanceTransactionRow[]}
      categories={(categories ?? []) as CategoryRow[]}
      accounts={(accounts ?? []) as Pick<FinanceAccountRow, 'id' | 'name' | 'type'>[]}
    />
  )
}
