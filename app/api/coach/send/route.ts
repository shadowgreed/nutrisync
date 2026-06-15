import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/ratelimit'
import { sendPushToUser } from '@/lib/push'

// Resolve a Copilot draft: 'send' delivers it to the member as a coach_message
// notification + best-effort web push; 'dismiss' just closes it. This is the only
// path by which a draft reaches a member, and it always requires the coach.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId, action, text } = await req.json() as {
    draftId?: string; action?: 'send' | 'dismiss'; text?: string
  }
  if (!draftId || (action !== 'send' && action !== 'dismiss')) {
    return NextResponse.json({ error: 'Missing draftId or action' }, { status: 400 })
  }

  // RLS restricts this to the coach who owns the draft.
  const { data: draft } = await supabase
    .from('coach_message_drafts')
    .select('id, member_id, draft_text, status')
    .eq('id', draftId)
    .single<{ id: string; member_id: string; draft_text: string; status: string }>()
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (draft.status !== 'pending') return NextResponse.json({ error: 'Draft already resolved' }, { status: 409 })

  if (action === 'dismiss') {
    await supabase.from('coach_message_drafts')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() }).eq('id', draft.id)
    return NextResponse.json({ ok: true })
  }

  // ── send ───────────────────────────────────────────────────────────────────
  if (!rateLimit(`coach-send:${user.id}`, 200, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Daily message limit reached.' }, { status: 429 })
  }
  const final = (text ?? '').trim() || draft.draft_text
  if (!final) return NextResponse.json({ error: 'Nothing to send' }, { status: 400 })
  if (final.length > 2000) return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
  const status = final === draft.draft_text ? 'sent' : 'edited_sent'

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  // Deliver to the member (notifications RLS only allows inserting your own rows).
  const { error: notifErr } = await admin
    .from('notifications')
    .insert({ user_id: draft.member_id, actor_id: user.id, type: 'coach_message', data: { text: final.slice(0, 500) } })
  if (notifErr) return NextResponse.json({ error: notifErr.message }, { status: 500 })

  // Push is best-effort — never fail the send over it.
  try {
    const { data: coach } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    const who = coach?.display_name ?? 'Your coach'
    const { count: unread } = await admin
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', draft.member_id).eq('read', false)
    await sendPushToUser(supabase, draft.member_id, {
      title: `🧑‍🏫 ${who} sent you a check-in`,
      body: final.slice(0, 120),
      url: '/notifications',
      tag: `coach-${user.id}`,
      count: unread ?? undefined,
    })
  } catch { /* ignore */ }

  await supabase.from('coach_message_drafts')
    .update({ status, sent_text: final, resolved_at: new Date().toISOString() }).eq('id', draft.id)

  return NextResponse.json({ ok: true })
}
