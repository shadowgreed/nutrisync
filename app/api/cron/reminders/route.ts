import { NextRequest, NextResponse } from 'next/server'
import type webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Local wall-clock time (hour/minute) for an IANA timezone.
function localTime(tz: string, date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  return { hour, minute }
}

const MEALS: Record<number, { type: string; label: string }> = {
  8:  { type: 'breakfast', label: 'breakfast' },
  13: { type: 'lunch',     label: 'lunch' },
  19: { type: 'dinner',    label: 'dinner' },
}

/**
 * Run by a scheduler (Vercel Cron or any external cron) ideally every ~30 min.
 * Sends water reminders every 2 waking hours and meal reminders at breakfast/
 * lunch/dinner — each skipped if the user already logged recently, with quiet
 * hours (22:00–08:00 local) and a 90-minute de-dupe.
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
  const RECENT_MS = 90 * 60 * 1000

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, reminder_timezone, water_reminders_enabled, meal_reminders_enabled, last_water_reminder_at, last_meal_reminder_at')
    .or('water_reminders_enabled.eq.true,meal_reminders_enabled.eq.true')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0

  for (const p of profiles ?? []) {
    const tz = p.reminder_timezone || 'America/New_York'
    const { hour, minute } = localTime(tz, now)
    if (hour < 8 || hour >= 22 || minute >= 30) continue // quiet hours + once-per-slot window

    const wantsWater = p.water_reminders_enabled && hour % 2 === 0 && hour <= 20
    const meal = p.meal_reminders_enabled ? MEALS[hour] : undefined
    if (!wantsWater && !meal) continue

    // Load this user's push subscriptions (admin client bypasses RLS)
    const { data: subRows } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', p.id)
    if (!subRows || subRows.length === 0) continue
    const subscriptions = subRows.map(r => r.subscription) as webpush.PushSubscription[]

    // ── Water ──
    if (wantsWater) {
      const recent = p.last_water_reminder_at && now.getTime() - new Date(p.last_water_reminder_at).getTime() < RECENT_MS
      if (!recent) {
        const since = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('water_logs').select('id', { count: 'exact', head: true })
          .eq('user_id', p.id).gte('logged_at', since)
        if ((count ?? 0) === 0) {
          sent += await sendPushToSubscriptions(subscriptions, {
            title: '💧 Hydration check', body: 'Time for some water!', url: '/dashboard', tag: 'water-reminder',
          })
          await supabase.from('profiles').update({ last_water_reminder_at: now.toISOString() }).eq('id', p.id)
        }
      }
    }

    // ── Meal ──
    if (meal) {
      const recent = p.last_meal_reminder_at && now.getTime() - new Date(p.last_meal_reminder_at).getTime() < RECENT_MS
      if (!recent) {
        const since = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
        const { count } = await supabase
          .from('food_logs').select('id', { count: 'exact', head: true })
          .eq('user_id', p.id).eq('meal_type', meal.type).gte('logged_at', since)
        if ((count ?? 0) === 0) {
          sent += await sendPushToSubscriptions(subscriptions, {
            title: '🍽️ Meal time', body: `Don't forget to log your ${meal.label}.`, url: '/log', tag: 'meal-reminder',
          })
          await supabase.from('profiles').update({ last_meal_reminder_at: now.toISOString() }).eq('id', p.id)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
