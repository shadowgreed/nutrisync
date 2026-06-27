import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest, boundedString } from '@/lib/validate'

interface PushSub {
  endpoint: string
  keys?: { p256dh: string; auth: string }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson<{ subscription?: PushSub }>(req)
  const sub = body?.subscription
  // Validate the push endpoint is a real https URL and the keys look like keys
  // before persisting — a garbage row just fails silently at push time.
  const endpoint = boundedString(sub?.endpoint, 1024)
  if (!endpoint || !/^https:\/\//.test(endpoint)) {
    return badRequest('Invalid subscription')
  }
  const p256dh = boundedString(sub?.keys?.p256dh, 256)
  const auth = boundedString(sub?.keys?.auth, 256)
  const subscription: PushSub = { endpoint, keys: p256dh && auth ? { p256dh, auth } : undefined }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint: subscription.endpoint, subscription },
      { onConflict: 'endpoint' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson<{ endpoint?: string }>(req)
  const endpoint = boundedString(body?.endpoint, 1024)
  if (endpoint) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  }
  return NextResponse.json({ ok: true })
}
