import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Records that the signed-in user accepted Terms + Privacy (timestamp + version).
// Append-only audit trail; best-effort (signup should not fail if logging does).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { version } = await req.json().catch(() => ({})) as { version?: string }
  const { error } = await supabase.from('consent_events').insert({
    user_id: user.id,
    kind: 'signup_terms',
    version: typeof version === 'string' ? version.slice(0, 32) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
