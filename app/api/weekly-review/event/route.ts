import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'

const EVENTS = new Set([
  'weekly_review_opened',
  'weekly_review_slide_viewed',
  'weekly_review_completed',
  'weekly_review_shared',
  'weekly_review_paused',
  'weekly_review_dismissed',
  'weekly_review_mission_accepted',
  'weekly_review_group_comparison_viewed',
])

// Records a Weekly Review analytics event. Fire-and-forget from the client.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimitDurable(supabase, `wr-event:${user.id}`, 400, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: true }) // best-effort; drop silently
  }

  const body = await req.json().catch(() => ({})) as { event?: string; slide?: string; weekKey?: string }
  if (!body.event || !EVENTS.has(body.event)) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  }

  const { error } = await supabase.from('weekly_review_events').insert({
    user_id: user.id,
    event: body.event,
    slide: typeof body.slide === 'string' ? body.slide.slice(0, 40) : null,
    week_key: typeof body.weekKey === 'string' ? body.weekKey.slice(0, 16) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
