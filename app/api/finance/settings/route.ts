import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest } from '@/lib/validate'
import { parseCents, centsToNumericString } from '@/lib/finance/money'
import { currentMonth } from '@/lib/finance/dashboard'
import { BUDGET_KEY_BUFFER, BUDGET_KEY_DEBT } from '@/lib/finance/seed'

const MAX_MONTHLY_CENTS = 10_000_000 // $100k/mo cap

/**
 * Persist the two payoff-plan knobs (monthly debt budget + buffer
 * contribution) as this month's finance_budgets rows.
 */
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()

  const upserts: Array<{ category: string; cents: number }> = []
  for (const [key, category] of [['debtBudget', BUDGET_KEY_DEBT], ['bufferMonthly', BUDGET_KEY_BUFFER]] as const) {
    if (!(key in body)) continue
    const cents = parseCents(body[key] as string | number)
    if (cents === null || cents < 0 || cents > MAX_MONTHLY_CENTS) return badRequest(`Invalid ${key}`)
    upserts.push({ category, cents })
  }
  if (upserts.length === 0) return badRequest('Nothing to update')

  const month = currentMonth()
  const { error } = await supabase.from('finance_budgets').upsert(
    upserts.map(u => ({
      user_id: user.id,
      category: u.category,
      month,
      planned_amount: centsToNumericString(u.cents),
    })),
    { onConflict: 'user_id,category,month' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
