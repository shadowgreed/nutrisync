import type { SupabaseClient } from '@supabase/supabase-js'
import { SEED_CARDS, SEED_CATEGORIES } from './seed'
import { centsToNumericString } from './money'
import { bpToAprString } from './payoff'

/**
 * First-visit seeding: a migration can't know auth.uid(), so the finance
 * layout calls this once per request and it no-ops unless the user has no
 * finance data yet. Inserts the real accounts, the category tree, and the
 * starting debt snapshot so the app is useful on first load.
 */
export async function ensureFinanceSeed(supabase: SupabaseClient, userId: string): Promise<void> {
  const { count, error } = await supabase
    .from('finance_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  // On error (e.g. migration not applied yet) don't attempt to seed.
  if (error || (count ?? 0) > 0) return

  const today = new Date().toISOString().slice(0, 10)

  await supabase.from('finance_accounts').insert([
    { user_id: userId, name: 'Checking', type: 'checking', current_balance: '0.00' },
    { user_id: userId, name: 'Buffer', type: 'savings', current_balance: '0.00' },
    ...SEED_CARDS.map(c => ({
      user_id: userId,
      name: c.name,
      type: 'credit',
      current_balance: centsToNumericString(c.balanceCents),
      apr: bpToAprString(c.aprBp),
      min_payment: centsToNumericString(c.minPaymentCents),
    })),
  ])

  const { count: catCount } = await supabase
    .from('finance_categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((catCount ?? 0) === 0) {
    await supabase.from('finance_categories').insert(
      SEED_CATEGORIES.map(c => ({ user_id: userId, name: c.name, parent: c.parent })),
    )
  }

  await supabase.from('finance_debt_snapshots').upsert(
    SEED_CARDS.map(c => ({
      user_id: userId,
      card_name: c.name,
      balance: centsToNumericString(c.balanceCents),
      apr: bpToAprString(c.aprBp),
      min_payment: centsToNumericString(c.minPaymentCents),
      snapshot_date: today,
    })),
    { onConflict: 'user_id,card_name,snapshot_date', ignoreDuplicates: true },
  )
}
