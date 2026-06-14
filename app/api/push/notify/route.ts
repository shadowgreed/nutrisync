import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

// Recipient's unread notification count, for the app-icon badge. Best-effort.
async function unreadCount(userId: string): Promise<number | undefined> {
  try {
    const admin = createAdminClient()
    const { count } = await admin
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false)
    return count ?? undefined
  } catch {
    return undefined
  }
}

// Sends a web-push to the owner of a food log after someone reacts/comments.
// The in-app notification row is created separately by a DB trigger; this only
// handles push delivery. No-op if the actor is the owner or push isn't set up.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { foodLogId, kind, targetUserId } = await req.json() as {
    foodLogId: string; kind: 'reaction' | 'comment' | 'reply'; targetUserId?: string
  }
  if (!foodLogId) return NextResponse.json({ error: 'Missing foodLogId' }, { status: 400 })

  // Replies push the parent comment's author (passed by the client); reactions
  // and top-level comments push the meal owner.
  let recipient: string | undefined
  if (kind === 'reply') {
    recipient = targetUserId
  } else {
    const { data: log } = await supabase.from('food_logs').select('user_id').eq('id', foodLogId).single()
    recipient = log?.user_id as string | undefined
  }
  if (!recipient || recipient === user.id) return NextResponse.json({ ok: true, skipped: true })

  const { data: actor } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const who = actor?.display_name ?? 'Someone'

  const body =
    kind === 'reply' ? `${who} replied to your comment`
    : kind === 'comment' ? `${who} commented on your meal`
    : `${who} reacted to your meal`

  // sendPushToUser is group-gated server-side, so targetUserId can't be abused
  // to push a stranger.
  await sendPushToUser(supabase, recipient, {
    title: 'NutriSync',
    body,
    url: '/feed',
    tag: `${kind}-${foodLogId}`,
    count: await unreadCount(recipient),
  })

  return NextResponse.json({ ok: true })
}
