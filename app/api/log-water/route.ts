import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/analytics'
import { parseJson, badRequest, boundedNumber, boundedString } from '@/lib/validate'
import { resolveTimeZone, userDayKey } from '@/lib/day'
import { totalMlOnDay } from '@/lib/water'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()
  const amount_ml = boundedNumber(body.amount_ml, 1, 10_000)   // ≤ 10L per log
  if (amount_ml === null) {
    return NextResponse.json({ error: 'amount_ml required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: user.id, amount_ml })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logEvent(supabase, user.id, 'water_logged', { amount_ml: data?.amount_ml })

  // If this log pushed the user over their daily water target, post a one-per-day
  // milestone to the group feed (reuses the milestones table → realtime + RLS).
  // Best-effort: a logging hiccup here must never fail the water log itself.
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('water_daily_target_ml, reminder_timezone')
      .eq('id', user.id)
      .single()
    const targetMl = (profile?.water_daily_target_ml as number | null) ?? 2500
    const tz = resolveTimeZone(profile?.reminder_timezone as string | null)
    const today = userDayKey(new Date(), tz)

    // Sum today's water in the user's timezone (small window, filtered in JS so the
    // day boundary is correct regardless of how logged_at's UTC range maps).
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('water_logs')
      .select('amount_ml, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since)
    const totalToday = totalMlOnDay((recent ?? []) as { logged_at: string; amount_ml: number }[], tz, today)

    if (totalToday >= targetMl) {
      // key includes the day → fires once per user per day (UNIQUE user_id,type,key).
      await supabase.from('milestones').upsert(
        {
          user_id: user.id,
          type: 'water_goal',
          key: `water-${today}`,
          data: { total_ml: totalToday, target_ml: targetMl },
        },
        { onConflict: 'user_id,type,key', ignoreDuplicates: true },
      )
    }
  } catch (e) {
    console.warn('water-goal milestone check failed (non-fatal):', e)
  }

  return NextResponse.json({ log: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  const id = boundedString(body?.id, 64)
  if (!id) return badRequest('Missing id')
  const { error } = await supabase
    .from('water_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
