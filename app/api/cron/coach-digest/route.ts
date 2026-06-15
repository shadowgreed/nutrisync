import { NextRequest, NextResponse } from 'next/server'
import type webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push'
import { assessMember } from '@/lib/coach-server'
import { chooseKind, draftCheckin } from '@/lib/copilot-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Hour (each coach's local time) to send the daily digest.
const DIGEST_HOUR = 8

// Local date + wall-clock hour for an IANA timezone (same helper as the other crons).
function localParts(tz: string, date: Date): { date: string; hour: number } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (t: string) => p.find(x => x.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 }
}

interface MemberProfile {
  id: string; display_name: string | null; calorie_target: number | null
  privacy_mode: string | null; coach_visible: boolean | null
}

/**
 * Daily coach digest. Runs hourly (like the reminders / weekly-report crons); for
 * each coach currently at DIGEST_HOUR local time and not yet digested today, it
 * assesses every client, pre-builds a Copilot draft for anyone who needs attention
 * (so the queue is ready), and pushes the coach a "N clients need a check-in" nudge.
 */
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 }) }

  const now = new Date()
  const twentyHoursMs = 20 * 60 * 60 * 1000

  // All coach memberships → coachId -> set of group ids.
  const { data: coachRows, error } = await admin
    .from('group_members').select('user_id, group_id').eq('role', 'coach')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const groupsByCoach = new Map<string, string[]>()
  for (const r of coachRows ?? []) {
    const arr = groupsByCoach.get(r.user_id as string) ?? []
    arr.push(r.group_id as string); groupsByCoach.set(r.user_id as string, arr)
  }
  if (groupsByCoach.size === 0) return NextResponse.json({ ok: true, coaches: 0, sent: 0 })

  const { data: coachProfiles } = await admin
    .from('profiles')
    .select('id, display_name, coach_style, reminder_timezone, last_coach_digest_at')
    .in('id', [...groupsByCoach.keys()])

  let pushed = 0
  let processed = 0

  for (const coach of coachProfiles ?? []) {
    const tz = (coach.reminder_timezone as string) || 'America/New_York'
    const { hour } = localParts(tz, now)
    if (hour !== DIGEST_HOUR) continue
    if (coach.last_coach_digest_at && now.getTime() - new Date(coach.last_coach_digest_at as string).getTime() < twentyHoursMs) continue
    processed++

    const groupIds = groupsByCoach.get(coach.id as string) ?? []
    const { data: memberRows } = await admin
      .from('group_members')
      .select('user_id, group_id, profiles(id, display_name, calorie_target, privacy_mode, coach_visible)')
      .in('group_id', groupIds)
      .neq('user_id', coach.id as string)

    let needsCount = 0

    for (const row of memberRows ?? []) {
      const p = row.profiles as unknown as MemberProfile | null
      if (!p) continue
      if (p.privacy_mode === 'dark' || p.coach_visible === false) continue

      const { attention, signals, report } = await assessMember(admin, p.id, p.calorie_target ?? 2000)
      if (attention !== 'needs_attention') continue
      needsCount++

      // Skip if a pending draft already exists for this coach↔member.
      const { data: existing } = await admin
        .from('coach_message_drafts')
        .select('id')
        .eq('coach_id', coach.id as string).eq('member_id', p.id).eq('status', 'pending')
        .maybeSingle()
      if (existing) continue

      const kind = chooseKind(signals)
      const { text } = await draftCheckin({
        coachName: (coach.display_name as string) ?? 'Coach',
        coachStyle: coach.coach_style as string | null,
        memberFirstName: (p.display_name ?? 'there').trim().split(/\s+/)[0],
        kind, signals, report,
      })
      await admin.from('coach_message_drafts').insert({
        group_id: row.group_id as string, coach_id: coach.id as string, member_id: p.id, kind,
        draft_text: text, basis: { source: 'digest', signals: signals.map(s => s.label) },
      })
    }

    if (needsCount > 0) {
      const body = `${needsCount} client${needsCount === 1 ? '' : 's'} need a check-in. Drafts are ready in your queue.`
      await admin.from('notifications').insert({
        user_id: coach.id as string, type: 'coach_nudge', data: { count: needsCount },
      })
      const { data: subRows } = await admin
        .from('push_subscriptions').select('subscription').eq('user_id', coach.id as string)
      if (subRows && subRows.length) {
        const subs = subRows.map(r => r.subscription) as webpush.PushSubscription[]
        const { count: unread } = await admin
          .from('notifications').select('id', { count: 'exact', head: true })
          .eq('user_id', coach.id as string).eq('read', false)
        pushed += await sendPushToSubscriptions(subs, {
          title: '🧑‍🏫 Your coaching check-ins',
          body,
          url: '/coach/queue',
          tag: 'coach-digest',
          count: unread ?? undefined,
        })
      }
    }

    await admin.from('profiles').update({ last_coach_digest_at: now.toISOString() }).eq('id', coach.id as string)
  }

  return NextResponse.json({ ok: true, coaches: processed, sent: pushed })
}
