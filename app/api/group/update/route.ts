import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseJson, badRequest } from '@/lib/validate'

// Founder-only group edits (name / cover photo). Writes with the admin client
// after verifying ownership, so a missing/incorrect RLS UPDATE policy can never
// turn the save into a silent 0-row no-op (the bug behind "photo not updating").
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = await parseJson<{ groupId?: string; name?: string; photo_url?: string }>(req)
  if (!parsed) return badRequest()
  const { groupId, name, photo_url } = parsed
  if (!groupId) return NextResponse.json({ error: 'Missing groupId' }, { status: 400 })

  const update: { name?: string; photo_url?: string } = {}
  if (typeof name === 'string' && name.trim()) update.name = name.trim().slice(0, 40)
  if (typeof photo_url === 'string' && photo_url) update.photo_url = photo_url
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  // Ownership check with the admin client (founder always sees their group).
  const { data: g } = await admin.from('groups').select('created_by').eq('id', groupId).single()
  if (!g) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (g.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group founder can edit the group' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('groups')
    .update(update)
    .eq('id', groupId)
    .select('id, name, photo_url')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update did not apply' }, { status: 500 })
  }
  return NextResponse.json({ group: data })
}
