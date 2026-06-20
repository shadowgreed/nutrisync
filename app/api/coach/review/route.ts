import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groupForCoachMember } from '@/lib/coach-server'

// Mark a client's workspace as reviewed (stamps reviewed_at on the coach↔member
// settings row). Coach-only; RLS enforces ownership.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json() as { memberId?: string }
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })

  const groupId = await groupForCoachMember(supabase, user.id, memberId)
  if (!groupId) return NextResponse.json({ error: 'Not your client' }, { status: 403 })

  const reviewed_at = new Date().toISOString()
  const { error } = await supabase
    .from('coach_client_settings')
    .upsert(
      { coach_id: user.id, member_id: memberId, group_id: groupId, reviewed_at, updated_at: reviewed_at },
      { onConflict: 'coach_id,member_id' },
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviewed_at })
}
