import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/analytics'
import { parseJson, badRequest, boundedNumber, boundedString } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()
  const amount_ml = boundedNumber(body.amount_ml, 1, 10_000)   // ≤ 10L per log
  if (amount_ml === null) {
    return NextResponse.json({ error: 'amount_ml required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: user.id, amount_ml })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logEvent(supabase, user.id, 'water_logged', { amount_ml: data?.amount_ml })
  return NextResponse.json({ log: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  const id = boundedString(body?.id, 64)
  if (!id) return badRequest('Missing id')
  const { error } = await supabase
    .from('water_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
