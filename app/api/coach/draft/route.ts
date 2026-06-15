import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/ratelimit'
import { groupForCoachMember, assessMember } from '@/lib/coach-server'
import { chooseKind, draftCheckin } from '@/lib/copilot-ai'

// Generate (or regenerate) a Copilot check-in draft for one member. The draft is
// stored as 'pending' — it does NOT reach the member until the coach sends it.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json() as { memberId?: string }
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })

  // Drafting calls the LLM — keep it bounded per coach and per member.
  if (!rateLimit(`coach-draft:${user.id}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many drafts this hour — try again soon.' }, { status: 429 })
  }
  if (!rateLimit(`coach-draft:${user.id}:${memberId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Plenty of drafts for this member already — give it a minute.' }, { status: 429 })
  }

  const groupId = await groupForCoachMember(supabase, user.id, memberId)
  if (!groupId) return NextResponse.json({ error: 'Not your client' }, { status: 403 })

  const { data: member } = await supabase
    .from('profiles')
    .select('display_name, calorie_target, privacy_mode, coach_visible')
    .eq('id', memberId)
    .single<{ display_name: string | null; calorie_target: number | null; privacy_mode: string | null; coach_visible: boolean | null }>()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.privacy_mode === 'dark' || member.coach_visible === false) {
    return NextResponse.json({ error: 'This member has opted out of coach view' }, { status: 403 })
  }

  const { signals, report } = await assessMember(supabase, memberId, member.calorie_target ?? 2000)
  const kind = chooseKind(signals)

  const { data: coach } = await supabase
    .from('profiles').select('display_name, coach_style').eq('id', user.id).single<{ display_name: string | null; coach_style: string | null }>()

  const { text } = await draftCheckin({
    coachName: coach?.display_name ?? 'Coach',
    coachStyle: coach?.coach_style,
    memberFirstName: (member.display_name ?? 'there').trim().split(/\s+/)[0],
    kind, signals, report,
  })

  // One live draft per coach↔member: clear any existing pending one first.
  await supabase.from('coach_message_drafts')
    .delete().eq('coach_id', user.id).eq('member_id', memberId).eq('status', 'pending')

  const { data: draft, error } = await supabase
    .from('coach_message_drafts')
    .insert({
      group_id: groupId, coach_id: user.id, member_id: memberId, kind,
      draft_text: text,
      basis: { attention: signals.length ? 'flagged' : 'routine', signals: signals.map(s => s.label) },
    })
    .select('id, kind, draft_text, status, created_at')
    .single()

  if (error || !draft) return NextResponse.json({ error: error?.message ?? 'Could not create draft' }, { status: 500 })
  return NextResponse.json({ draft })
}
