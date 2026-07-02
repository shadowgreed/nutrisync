import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'

const KINDS = new Set(['incorrect_estimate', 'inappropriate', 'other'])

// Records a user report about an AI nutrition estimate (the "Report incorrect
// estimate" affordance required by the stores' AI-content policies).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimitDurable(supabase, `ai-feedback:${user.id}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Thanks — you’ve sent a lot of reports this hour.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({})) as { kind?: string; context?: string; detail?: string; foodLogId?: string }
  const kind = body.kind && KINDS.has(body.kind) ? body.kind : 'incorrect_estimate'

  const { error } = await supabase.from('ai_feedback').insert({
    user_id: user.id,
    kind,
    context: typeof body.context === 'string' ? body.context.slice(0, 40) : null,
    detail: typeof body.detail === 'string' ? body.detail.slice(0, 300) : null,
    food_log_id: typeof body.foodLogId === 'string' ? body.foodLogId : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
