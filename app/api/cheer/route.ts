import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/ratelimit'
import { sendPushToUser } from '@/lib/push'

// Send an encouragement ("cheer") to a group co-member: in-app notification +
// best-effort web push. Notifications RLS only allows inserting your own rows,
// so the row is written with the admin client after verifying co-membership.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await req.json() as { userId?: string }
  if (!userId || userId === user.id) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }
  // Cheers create notifications + pushes — keep them special, not spammable.
  if (!rateLimit(`cheer:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "You've cheered a lot this hour — save some for later! 👏" }, { status: 429 })
  }

  // Only allow cheering people who actually share a group with the sender.
  const { data: memberRows } = await supabase.rpc('get_my_group_member_ids')
  const ids = Array.isArray(memberRows)
    ? (memberRows as unknown[]).map(r =>
        typeof r === 'string' ? r : (r as Record<string, string>)?.get_my_group_member_ids)
    : []
  if (!ids.includes(userId)) {
    return NextResponse.json({ error: 'Not in your group' }, { status: 403 })
  }

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Not configured' }, { status: 500 }) }

  const { error } = await admin
    .from('notifications')
    .insert({ user_id: userId, actor_id: user.id, type: 'cheer', data: {} })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push is best-effort — never fail the cheer over it.
  try {
    const { data: actor } = await supabase
      .from('profiles').select('display_name').eq('id', user.id).single()
    const who = actor?.display_name ?? 'A group member'
    const { count: unread } = await admin
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false)
    await sendPushToUser(supabase, userId, {
      title: '👏 Cheer received',
      body: `${who} cheered you on — keep it up!`,
      url: '/notifications',
      tag: `cheer-${user.id}`,
      count: unread ?? undefined,
    })
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true })
}
