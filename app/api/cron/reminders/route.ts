import { NextRequest, NextResponse } from 'next/server'
import type webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push'
import { getDict, resolveLocale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Local date + wall-clock time for an IANA timezone.
function localParts(tz: string, date: Date): { date: string; hour: number; minute: number } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (t: string) => p.find(x => x.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24, minute: Number(get('minute')) }
}

const MEALS: Record<number, { type: string; label: string }> = {
  8:  { type: 'breakfast', label: 'breakfast' },
  13: { type: 'lunch',     label: 'lunch' },
  19: { type: 'dinner',    label: 'dinner' },
}

/**
 * Triggered by a scheduler (Supabase pg_cron, cron-job.org, etc.) every ~30 min.
 * Uses date+hour "slots" instead of a minute window so it fires correctly no
 * matter when within the hour the scheduler runs (and never twice per slot).
 */
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let supabase
  try { supabase = createAdminClient() }
  catch { return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 }) }

  const now = new Date()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, reminder_timezone, water_reminders_enabled, meal_reminders_enabled, last_water_reminder_at, last_meal_reminder_at, language')
    .or('water_reminders_enabled.eq.true,meal_reminders_enabled.eq.true')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  let candidates = 0

  for (const p of profiles ?? []) {
    const dict = getDict(resolveLocale(p.language))
    const t = dict.pushNotify
    const tz = p.reminder_timezone || 'America/New_York'
    const { date, hour } = localParts(tz, now)
    if (hour < 8 || hour >= 22) continue // quiet hours

    const wantsWater = p.water_reminders_enabled && hour % 2 === 0 && hour <= 20
    const meal = p.meal_reminders_enabled ? MEALS[hour] : undefined
    if (!wantsWater && !meal) continue
    candidates++

    const { data: subRows } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', p.id)
    if (!subRows || subRows.length === 0) continue
    const subscriptions = subRows.map(r => r.subscription) as webpush.PushSubscription[]

    // ── Water: one per even-hour slot ──
    if (wantsWater) {
      const slot = `${date}-${hour}` // already even
      const lastSlot = p.last_water_reminder_at
        ? `${localParts(tz, new Date(p.last_water_reminder_at)).date}-${localParts(tz, new Date(p.last_water_reminder_at)).hour}`
        : ''
      if (slot !== lastSlot) {
        const since = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('water_logs').select('id', { count: 'exact', head: true })
          .eq('user_id', p.id).gte('logged_at', since)
        if ((count ?? 0) === 0) {
          sent += await sendPushToSubscriptions(subscriptions, {
            title: t.hydrationTitle, body: t.hydrationBody, url: '/dashboard', tag: 'water-reminder',
          })
        }
        await supabase.from('profiles').update({ last_water_reminder_at: now.toISOString() }).eq('id', p.id)
      }
    }

    // ── Meal: one per meal-hour slot ──
    if (meal) {
      const slot = `${date}-${hour}`
      const lastSlot = p.last_meal_reminder_at
        ? `${localParts(tz, new Date(p.last_meal_reminder_at)).date}-${localParts(tz, new Date(p.last_meal_reminder_at)).hour}`
        : ''
      if (slot !== lastSlot) {
        const since = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('food_logs').select('id', { count: 'exact', head: true })
          .eq('user_id', p.id).eq('meal_type', meal.type).gte('logged_at', since)
        if ((count ?? 0) === 0) {
          const mealLabel = (dict.mealTypes as Record<string, { label: string }>)[meal.type]?.label.toLowerCase() ?? meal.label
          sent += await sendPushToSubscriptions(subscriptions, {
            title: t.mealTitle, body: t.mealBody(mealLabel), url: '/log', tag: 'meal-reminder',
          })
        }
        await supabase.from('profiles').update({ last_meal_reminder_at: now.toISOString() }).eq('id', p.id)
      }
    }
  }

  return NextResponse.json({ ok: true, candidates, sent })
}
