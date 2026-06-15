import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Founder-only: expel a member from a group they founded. Writes with the admin
// client after verifying ownership (mirrors /api/group/update), so a missing RLS
// DELETE policy on group_members can never silently no-op the removal.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId, userId } = await req.json() as { groupId?: string; userId?: string }
  if (!groupId || !userId) return NextResponse.json({ error: 'Missing groupId or userId' }, { status: 400 })

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  const { data: g } = await admin.from('groups').select('created_by').eq('id', groupId).single()
  if (!g) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (g.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group founder can remove members' }, { status: 403 })
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "The founder can't remove themselves — use Leave group" }, { status: 400 })
  }

  const { error } = await admin
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
