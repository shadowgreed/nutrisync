import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitDurable } from '@/lib/ratelimit'
import { sendPushToUser } from '@/lib/push'
import { groupForCoachMember } from '@/lib/coach-server'
import { parseJson, badRequest } from '@/lib/validate'

// Send a ready-made coaching message (e.g. a "Recommended action" play) straight
// to a member — no Copilot draft round-trip. Delivery mirrors /api/coach/send:
// a coach_message notification + best-effort push. The send is recorded in
// coach_message_drafts so it shows in intervention history; basis.source marks it
// as templated so it's excluded from the coach's learned voice.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = await parseJson<{ memberId?: string; text?: string; title?: string }>(req)
  if (!parsed) return badRequest()
  const { memberId, text, title } = parsed
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })
  const final = (text ?? '').trim()
  if (!final) return NextResponse.json({ error: 'Nothing to send' }, { status: 400 })
  if (final.length > 2000) return NextResponse.json({ error: 'Message is too long' }, { status: 400 })

  // Shares the daily cap with Copilot sends so total messages to a member stay bounded.
  if (!(await rateLimitDurable(supabase, `coach-send:${user.id}`, 200, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Daily message limit reached.' }, { status: 429 })
  }

  // Authorize: must coach this member, and the member can't have opted out.
  const groupId = await groupForCoachMember(supabase, user.id, memberId)
  if (!groupId) return NextResponse.json({ error: 'Not your client' }, { status: 403 })

  const { data: member } = await supabase
    .from('profiles')
    .select('privacy_mode, coach_visible')
    .eq('id', memberId)
    .single<{ privacy_mode: string | null; coach_visible: boolean | null }>()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.privacy_mode === 'dark' || member.coach_visible === false) {
    return NextResponse.json({ error: 'This member has opted out of coach view' }, { status: 403 })
  }

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  // Deliver to the member (notifications RLS only allows inserting your own rows).
  const { error: notifErr } = await admin
    .from('notifications')
    .insert({ user_id: memberId, actor_id: user.id, type: 'coach_message', data: { text: final.slice(0, 500) } })
  if (notifErr) return NextResponse.json({ error: notifErr.message }, { status: 500 })

  // Record the send for intervention history. Written with the coach's own client
  // so RLS confirms the coaching relationship; basis.source keeps it out of voice
  // learning (see /api/coach/draft).
  await supabase.from('coach_message_drafts').insert({
    group_id: groupId, coach_id: user.id, member_id: memberId, kind: 'nudge',
    draft_text: final, sent_text: final, status: 'sent',
    basis: { source: 'recommended_action', title: title ?? null },
    resolved_at: new Date().toISOString(),
  })

  // Push is best-effort — never fail the send over it.
  try {
    const { data: coach } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    const who = coach?.display_name ?? 'Your coach'
    const { count: unread } = await admin
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', memberId).eq('read', false)
    await sendPushToUser(supabase, memberId, {
      title: `🧑‍🏫 ${who} sent you a check-in`,
      body: final.slice(0, 120),
      url: '/notifications',
      tag: `coach-${user.id}`,
      count: unread ?? undefined,
    })
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true })
}
