import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { COACH_PLAN_MEMBER_CAP, FREE_PLAN_MEMBER_CAP } from '@/lib/coach-plan'

// Founder-only: set a group's plan ('free' | 'coach'), which gates the Copilot and
// the member cap. This is the single "monetization switch" the spec calls for (§9) —
// today it flips the boolean directly; wiring Stripe later replaces this one handler.
// Verifies ownership with the admin client (mirrors /api/group/update) so a missing
// RLS policy can't turn the change into a silent no-op.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groupId, plan } = await req.json() as { groupId?: string; plan?: 'free' | 'coach' }
  if (!groupId || (plan !== 'free' && plan !== 'coach')) {
    return NextResponse.json({ error: 'Missing groupId or plan' }, { status: 400 })
  }

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  const { data: g } = await admin.from('groups').select('created_by, member_cap').eq('id', groupId).single()
  if (!g) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (g.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the group founder can change the plan' }, { status: 403 })
  }

  // Raise the cap when upgrading; when downgrading, only lower it back to the free
  // cap if it hasn't been customised above that (don't shrink a manually-set cap).
  const member_cap = plan === 'coach'
    ? Math.max(g.member_cap as number, COACH_PLAN_MEMBER_CAP)
    : Math.min(g.member_cap as number, FREE_PLAN_MEMBER_CAP)

  const { data, error } = await admin
    .from('groups')
    .update({ plan, member_cap })
    .eq('id', groupId)
    .select('id, plan, member_cap')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update did not apply' }, { status: 500 })
  return NextResponse.json({ group: data })
}
