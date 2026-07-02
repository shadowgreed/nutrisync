import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest } from '@/lib/validate'

// Group founder approves or denies a pending join request. The SECURITY DEFINER
// function verifies the caller actually owns the group before adding the member.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = await parseJson<{ requestId?: string; approve?: boolean }>(req)
  if (!parsed) return badRequest()
  const { requestId, approve } = parsed
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  const { data, error } = await supabase.rpc('resolve_join_request', {
    p_request_id: requestId,
    p_approve: !!approve,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // data is the function's text result: approved | denied | full | forbidden | not_found
  if (data === 'forbidden') return NextResponse.json({ error: 'Only the group founder can do that' }, { status: 403 })
  if (data === 'full') return NextResponse.json({ error: 'Group is full (max 6)' }, { status: 409 })
  return NextResponse.json({ ok: true, result: data })
}
