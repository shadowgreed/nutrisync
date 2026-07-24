import type { SupabaseClient } from '@supabase/supabase-js'
import { dbToCents } from './money'
import { aprToBp, type DebtCard } from './payoff'
import {
  BUDGET_KEY_BUFFER,
  BUDGET_KEY_DEBT,
  DEFAULT_BUFFER_MONTHLY_CENTS,
  DEFAULT_DEBT_BUDGET_CENTS,
} from './seed'

/** Row shapes as supabase-js returns them (NUMERIC comes back as string). */
export interface FinanceAccountRow {
  id: string
  name: string
  type: 'checking' | 'credit' | 'savings'
  current_balance: string | number | null
  credit_limit: string | number | null
  apr: string | number | null
  min_payment: string | number | null
}

export interface FinanceTransactionRow {
  id: string
  account_id: string | null
  date: string
  description: string
  amount: string | number
  category: string | null
  subcategory: string | null
  is_recurring: boolean
  source: 'plaid' | 'csv' | 'manual'
}

export interface CategoryRow {
  id: string
  name: string
  parent: string | null
}

export interface PlanSettings {
  debtBudgetCents: number
  bufferMonthlyCents: number
}

export function accountToCard(a: FinanceAccountRow): DebtCard & { id: string } {
  return {
    id: a.id,
    name: a.name,
    balanceCents: dbToCents(a.current_balance),
    aprBp: aprToBp(a.apr ?? 0),
    minPaymentCents: dbToCents(a.min_payment),
  }
}

/**
 * The payoff-plan knobs live as finance_budgets rows ('Debt Payment' and
 * 'Savings'); the most recent month's row wins, defaults otherwise.
 */
export async function getPlanSettings(supabase: SupabaseClient, userId: string): Promise<PlanSettings> {
  const { data } = await supabase
    .from('finance_budgets')
    .select('category, month, planned_amount')
    .eq('user_id', userId)
    .in('category', [BUDGET_KEY_DEBT, BUDGET_KEY_BUFFER])
    .order('month', { ascending: false })

  const latest = (key: string) => data?.find(r => r.category === key)?.planned_amount
  const debt = latest(BUDGET_KEY_DEBT)
  const buffer = latest(BUDGET_KEY_BUFFER)
  return {
    debtBudgetCents: debt != null ? dbToCents(debt) : DEFAULT_DEBT_BUDGET_CENTS,
    bufferMonthlyCents: buffer != null ? dbToCents(buffer) : DEFAULT_BUFFER_MONTHLY_CENTS,
  }
}
