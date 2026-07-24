import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest, boundedString } from '@/lib/validate'
import { parseCents, centsToNumericString } from '@/lib/finance/money'
import { normalizeDate } from '@/lib/finance/csv'

// ±$1,000,000 per transaction — anything bigger is a typo.
const MAX_AMOUNT_CENTS = 100_000_000

function parseAmount(v: unknown): string | null {
  const cents = parseCents(typeof v === 'string' || typeof v === 'number' ? v : NaN)
  if (cents === null || Math.abs(cents) > MAX_AMOUNT_CENTS) return null
  return centsToNumericString(cents)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()

  const date = normalizeDate(boundedString(body.date, 10) ?? '')
  const amount = parseAmount(body.amount)
  if (!date || amount === null) return badRequest('date and amount required')

  const { data, error } = await supabase
    .from('finance_transactions')
    .insert({
      user_id: user.id,
      account_id: boundedString(body.account_id, 64),
      date,
      description: boundedString(body.description, 200) ?? '',
      amount,
      category: boundedString(body.category, 60),
      subcategory: boundedString(body.subcategory, 60),
      is_recurring: body.is_recurring === true,
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  const id = boundedString(body?.id, 64)
  if (!body || !id) return badRequest('Missing id')

  const patch: Record<string, unknown> = {}
  if ('category' in body) patch.category = boundedString(body.category, 60)
  if ('subcategory' in body) patch.subcategory = boundedString(body.subcategory, 60)
  if ('description' in body) patch.description = boundedString(body.description, 200) ?? ''
  if ('is_recurring' in body) patch.is_recurring = body.is_recurring === true
  if ('date' in body) {
    const date = normalizeDate(boundedString(body.date, 10) ?? '')
    if (!date) return badRequest('Invalid date')
    patch.date = date
  }
  if ('amount' in body) {
    const amount = parseAmount(body.amount)
    if (amount === null) return badRequest('Invalid amount')
    patch.amount = amount
  }
  if (Object.keys(patch).length === 0) return badRequest('Nothing to update')

  const { data, error } = await supabase
    .from('finance_transactions')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  const id = boundedString(body?.id, 64)
  if (!id) return badRequest('Missing id')

  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
