import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

// Sends a test web-push to the current user's own devices, so they can confirm
// delivery without needing a second account. get_push_subscriptions allows
// target = auth.uid(), so a self-push works.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sendPushToUser(supabase, user.id, {
    title: 'NutriSync',
    body: '🎉 Push notifications are working!',
    url: '/notifications',
    tag: 'test-push',
  })

  return NextResponse.json({ ok: true })
}
