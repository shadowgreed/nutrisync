import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'

// Records a Help Center analytics event (search / view / feedback). Fire-and-
// forget from the client — it returns ok even on validation no-ops so it never
// disrupts the reading experience.
type Body = {
  type?: 'search' | 'view' | 'feedback'
  slug?: string
  query?: string
  resultCount?: number
  helpful?: boolean
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Generous cap — views + debounced searches + feedback across a session.
  if (!(await rateLimitDurable(supabase, `help-event:${user.id}`, 600, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: true }) // silently drop; analytics is best-effort
  }

  const body = await req.json().catch(() => ({})) as Body
  if (body.type !== 'search' && body.type !== 'view' && body.type !== 'feedback') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    type: body.type,
    slug: typeof body.slug === 'string' ? body.slug.slice(0, 80) : null,
    query: body.type === 'search' && typeof body.query === 'string' ? body.query.slice(0, 200) : null,
    result_count: body.type === 'search' && Number.isFinite(body.resultCount) ? Math.trunc(body.resultCount as number) : null,
    helpful: body.type === 'feedback' && typeof body.helpful === 'boolean' ? body.helpful : null,
  }

  const { error } = await supabase.from('help_events').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
