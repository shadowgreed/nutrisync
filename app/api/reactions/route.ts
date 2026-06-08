import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { food_log_id, emoji } = await req.json()
  if (!food_log_id || !emoji) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Upsert — one reaction per user per log (changes the emoji if re-reacting)
  const { data, error } = await supabase
    .from('reactions')
    .upsert({ user_id: user.id, food_log_id, emoji }, { onConflict: 'user_id,food_log_id' })
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
  if (!food_log_id) return NextResponse.json({ error: 'Missing food_log_id' }, { status: 400 })

  await supabase.from('reactions').delete().match({ user_id: user.id, food_log_id })
  return NextResponse.json({ ok: true })
}
