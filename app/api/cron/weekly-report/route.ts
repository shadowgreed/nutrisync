import { NextRequest, NextResponse } from 'next/server'
import type webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push'
import { getDict, resolveLocale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Local date + wall-clock hour for an IANA timezone.
function localParts(tz: string, date: Date): { date: string; hour: number } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (t: string) => p.find(x => x.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
}

/**
 * Sunday 9am (each user's local time) weekly report. Scheduled like the reminders
 * cron — run this hourly (or every 30 min) via pg_cron; it fires once per user per
 * week for whoever is currently at Sunday 09:xx local. Sends an in-app notification
 * + a best-effort web push linking to /weekly.
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
    .select('id, reminder_timezone, last_weekly_report_at, language')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  let candidates = 0
  const sixDaysMs = 6 * 24 * 60 * 60 * 1000

  for (const p of profiles ?? []) {
    const tz = p.reminder_timezone || 'America/New_York'
    const { date, hour } = localParts(tz, now)
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay() // 0 = Sunday
    if (dow !== 0 || hour !== 9) continue
    // Already sent this week?
    if (p.last_weekly_report_at && now.getTime() - new Date(p.last_weekly_report_at).getTime() < sixDaysMs) continue
    candidates++

    // In-app bell notification (reliable channel for everyone).
    await supabase.from('notifications').insert({ user_id: p.id, type: 'weekly_report', data: {} })

    // Web push (best effort).
    const { data: subRows } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', p.id)
    if (subRows && subRows.length) {
      const subs = subRows.map(r => r.subscription) as webpush.PushSubscription[]
      const { count: unread } = await supabase
        .from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', p.id).eq('read', false)
      const t = getDict(resolveLocale(p.language)).pushNotify
      sent += await sendPushToSubscriptions(subs, {
        title: t.weeklyReportTitle,
        body: t.weeklyReportBody,
        url: '/weekly',
        tag: 'weekly-report',
        count: unread ?? undefined,
      })
    }

    await supabase.from('profiles').update({ last_weekly_report_at: now.toISOString() }).eq('id', p.id)
  }

  return NextResponse.json({ ok: true, candidates, sent })
}
