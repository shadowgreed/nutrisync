import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/ratelimit'
import { isAppEvent } from '@/lib/analytics'

// Client-fired product events (group_created, group_joined, challenge_created,
// challenge_completed, …). Server-side actions insert directly via lib/analytics.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(`app-event:${user.id}`, 300, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true }) // best-effort; drop silently
  }

  const body = await req.json().catch(() => ({})) as { event?: string; props?: Record<string, unknown> }
  if (!isAppEvent(body.event)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const props = body.props && typeof body.props === 'object' ? body.props : {}
  const { error } = await supabase.from('app_events').insert({ user_id: user.id, event: body.event, props })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
