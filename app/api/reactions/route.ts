import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest, boundedString } from '@/lib/validate'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()
  const emoji = boundedString(body.emoji, 16)
  const food_log_id = boundedString(body.food_log_id, 64)
  const activity_log_id = boundedString(body.activity_log_id, 64)
  if (!emoji || (!food_log_id && !activity_log_id)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Upsert — one reaction per user per target (meal or activity).
  const row: Record<string, unknown> = activity_log_id
    ? { user_id: user.id, activity_log_id, emoji }
    : { user_id: user.id, food_log_id, emoji }
  const onConflict = activity_log_id ? 'user_id,activity_log_id' : 'user_id,food_log_id'

  const { data, error } = await supabase
    .from('reactions')
    .upsert(row, { onConflict })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reaction: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const food_log_id = req.nextUrl.searchParams.get('food_log_id')
  const activity_log_id = req.nextUrl.searchParams.get('activity_log_id')
  if (!food_log_id && !activity_log_id) return NextResponse.json({ error: 'Missing target' }, { status: 400 })

  const match = activity_log_id
    ? { user_id: user.id, activity_log_id }
    : { user_id: user.id, food_log_id }
  await supabase.from('reactions').delete().match(match)
  return NextResponse.json({ ok: true })
}
