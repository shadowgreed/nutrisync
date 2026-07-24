import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest, boundedString } from '@/lib/validate'
import { parseCents, centsToNumericString } from '@/lib/finance/money'
import { aprToBp, bpToAprString } from '@/lib/finance/payoff'

const MAX_BALANCE_CENTS = 10_000_000_000 // $100M NUMERIC(12,2) ceiling

function parseMoney(v: unknown, allowNegative = false): string | null {
  const cents = parseCents(typeof v === 'string' || typeof v === 'number' ? v : NaN)
  if (cents === null || Math.abs(cents) > MAX_BALANCE_CENTS) return null
  if (!allowNegative && cents < 0) return null
  return centsToNumericString(cents)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()
  const name = boundedString(body.name, 80)
  const type = boundedString(body.type, 20)
  if (!name || !type || !['checking', 'credit', 'savings'].includes(type)) {
    return badRequest('name and valid type required')
  }

  const { data, error } = await supabase
    .from('finance_accounts')
    .insert({
      user_id: user.id,
      name,
      type,
      current_balance: parseMoney(body.current_balance, true) ?? '0.00',
      credit_limit: 'credit_limit' in body ? parseMoney(body.credit_limit) : null,
      apr: 'apr' in body && body.apr != null ? bpToAprString(aprToBp(body.apr)) : null,
      min_payment: 'min_payment' in body ? parseMoney(body.min_payment) : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  const id = boundedString(body?.id, 64)
  if (!body || !id) return badRequest('Missing id')

  const patch: Record<string, unknown> = {}
  if ('name' in body) {
    const name = boundedString(body.name, 80)
    if (!name) return badRequest('Invalid name')
    patch.name = name
  }
  if ('current_balance' in body) {
    const v = parseMoney(body.current_balance, true)
    if (v === null) return badRequest('Invalid balance')
    patch.current_balance = v
  }
  if ('credit_limit' in body) {
    patch.credit_limit = body.credit_limit == null ? null : parseMoney(body.credit_limit)
    if (body.credit_limit != null && patch.credit_limit === null) return badRequest('Invalid credit limit')
  }
  if ('apr' in body) {
    if (body.apr == null || body.apr === '') patch.apr = null
    else {
      const bp = aprToBp(body.apr)
      if (bp <= 0 || bp > 10000) return badRequest('Invalid APR')
      patch.apr = bpToAprString(bp)
    }
  }
  if ('min_payment' in body) {
    patch.min_payment = body.min_payment == null ? null : parseMoney(body.min_payment)
    if (body.min_payment != null && patch.min_payment === null) return badRequest('Invalid minimum payment')
  }
  if (Object.keys(patch).length === 0) return badRequest('Nothing to update')

  const { data, error } = await supabase
    .from('finance_accounts')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
