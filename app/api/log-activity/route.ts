import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/analytics'
import { createAdminClient } from '@/lib/supabase/admin'
import { founderSharesGroupWith } from '@/lib/moderation'
import { parseJson, badRequest, boundedNumber, boundedString } from '@/lib/validate'

// Delete an activity post — its author, or a founder of the author's group.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error, count } = await supabase
    .from('activity_logs')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count && count > 0) return NextResponse.json({ ok: true })

  // Not the author's own — allow a group founder to remove a member's post.
  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  const { data: log } = await admin.from('activity_logs').select('user_id').eq('id', id).single()
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await founderSharesGroupWith(admin, user.id, log.user_id as string))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { error: delErr } = await admin.from('activity_logs').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, moderated: true })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()

  // Clamp every numeric to a sane range so we never store negatives/NaN/absurd values.
  const activity_name = boundedString(body.activity_name, 80)
  const duration_minutes = boundedNumber(body.duration_minutes, 0, 1440)   // ≤ 24h
  const distance_km = boundedNumber(body.distance_km, 0, 1000)
  const steps = boundedNumber(body.steps, 0, 500_000)
  const calories_burned = boundedNumber(body.calories_burned, 0, 50_000) ?? 0

  // A log needs either a duration (time-based) or a distance/steps (distance-based).
  if (!activity_name || ((duration_minutes ?? 0) <= 0 && (distance_km ?? 0) <= 0 && (steps ?? 0) <= 0)) {
    return NextResponse.json({ error: 'activity_name and a duration or distance is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      activity_name,
      duration_minutes: duration_minutes ?? null,
      distance_km: distance_km ?? null,
      steps: steps ?? null,
      calories_burned,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logEvent(supabase, user.id, 'activity_logged', { activity_name: data?.activity_name })
  return NextResponse.json({ activity: data })
}
