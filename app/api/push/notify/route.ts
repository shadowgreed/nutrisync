import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

// Sends a web-push to the owner of a food log after someone reacts/comments.
// The in-app notification row is created separately by a DB trigger; this only
// handles push delivery. No-op if the actor is the owner or push isn't set up.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { foodLogId, kind } = await req.json() as { foodLogId: string; kind: 'reaction' | 'comment' }
  if (!foodLogId) return NextResponse.json({ error: 'Missing foodLogId' }, { status: 400 })

  const { data: log } = await supabase
    .from('food_logs')
    .select('user_id')
    .eq('id', foodLogId)
    .single()

  const owner = log?.user_id as string | undefined
  if (!owner || owner === user.id) return NextResponse.json({ ok: true, skipped: true })

  const { data: actor } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()
  const who = actor?.display_name ?? 'Someone'

  await sendPushToUser(supabase, owner, {
    title: 'NutriSync',
    body: kind === 'comment' ? `${who} commented on your meal` : `${who} reacted to your meal`,
    url: '/feed',
    tag: `${kind}-${foodLogId}`,
  })

  return NextResponse.json({ ok: true })
}
