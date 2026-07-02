import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'
import { parseJson, badRequest } from '@/lib/validate'

// Coach private notes about a member. Writes go through the user's own client so
// RLS (coach_client_notes policies, migration 032) enforces that the caller is a
// coach of the group; we additionally verify the member actually belongs to it.

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimitDurable(supabase, `coach-note:${user.id}`, 60, 60_000))) {
    return NextResponse.json({ error: 'Slow down a moment' }, { status: 429 })
  }

  const parsed = await parseJson<{ groupId?: string; memberId?: string; body?: string }>(req)
  if (!parsed) return badRequest()
  const { groupId, memberId, body } = parsed
  const text = (body ?? '').trim()
  if (!groupId || !memberId || !text) {
    return NextResponse.json({ error: 'Missing groupId, memberId or body' }, { status: 400 })
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Note is too long (2000 char max)' }, { status: 400 })
  }

  // Confirm the member is in the group the coach named (RLS already confirms the
  // caller is that group's coach via the INSERT policy).
  const { data: rel } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', memberId)
    .maybeSingle()
  if (!rel) return NextResponse.json({ error: 'Member is not in that group' }, { status: 400 })

  const { data, error } = await supabase
    .from('coach_client_notes')
    .insert({ group_id: groupId, coach_id: user.id, member_id: memberId, body: text })
    .select('id, body, created_at')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Could not save note' }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = await parseJson<{ id?: string }>(req)
  const id = parsed?.id
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // RLS restricts deletes to the note's own coach.
  const { error } = await supabase.from('coach_client_notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
