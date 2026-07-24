import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CategoryRow } from '@/lib/finance/data'
import ImportClient from './ImportClient'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: categories }, { data: accounts }] = await Promise.all([
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
    <ImportClient
      categories={(categories ?? []) as CategoryRow[]}
      accounts={(accounts ?? []) as Array<{ id: string; name: string; type: string }>}
    />
  )
}
