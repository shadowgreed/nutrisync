import { NextRequest, NextResponse } from 'next/server'
import type webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push'
import { assessClient, type CopilotStrings } from '@/lib/copilot'
import { chooseKind, draftCheckin } from '@/lib/copilot-ai'
import { effectiveDiet, isDiet } from '@/lib/diets'
import { getDict, resolveLocale } from '@/lib/i18n'
import type { Diet, NutrientTotals, NutrientKey } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Hour (each coach's local time) to send the daily digest.
const DIGEST_HOUR = 8
const DAY_MS = 24 * 60 * 60 * 1000

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
  privacy_mode: string | null; coach_visible: boolean | null; diet: string | null
}
interface FoodRow { user_id: string; logged_at: string; total_calories: number | null; nutrient_totals: NutrientTotals | null }
interface ActivityRow { user_id: string; logged_at: string; calories_burned: number | null }

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
    .select('id, display_name, coach_style, reminder_timezone, last_coach_digest_at, language')
    .in('id', [...groupsByCoach.keys()])

  let pushed = 0
  let processed = 0

  for (const coach of coachProfiles ?? []) {
    const tz = (coach.reminder_timezone as string) || 'America/New_York'
    const { hour } = localParts(tz, now)
    if (hour !== DIGEST_HOUR) continue
    if (coach.last_coach_digest_at && now.getTime() - new Date(coach.last_coach_digest_at as string).getTime() < twentyHoursMs) continue
    processed++

    const coachId = coach.id as string
    const groupIds = groupsByCoach.get(coachId) ?? []
    // Signals phrased in the coach's own language, same reasoning as the
    // interactive draft route — this is the coach's digest, in the coach's UI.
    const digestDict = getDict(resolveLocale(coach.language))
    const copilotStrings: CopilotStrings = {
      ...digestDict.coach.signals,
      nutrientLabel: (key: NutrientKey) => digestDict.nutrients[key],
      dietLabel: (d) => d ? digestDict.diets[d] : digestDict.editProfile.noDiet,
    }
    const { data: memberRows } = await admin
      .from('group_members')
      .select('user_id, group_id, profiles(id, display_name, calorie_target, privacy_mode, coach_visible, diet)')
      .in('group_id', groupIds)
      .neq('user_id', coachId)

    // Visible clients (respect the dark / coach_visible opt-out).
    const clients = (memberRows ?? [])
      .map(row => ({ groupId: row.group_id as string, p: row.profiles as unknown as MemberProfile | null }))
      .filter((c): c is { groupId: string; p: MemberProfile } =>
        !!c.p && c.p.privacy_mode !== 'dark' && c.p.coach_visible !== false)
    const memberIds = [...new Set(clients.map(c => c.p.id))]

    if (memberIds.length > 0) {
      // Batch everything this coach needs: 30d of logs, diet overrides, and which
      // members already have a pending draft — instead of querying per member.
      const since = new Date(now.getTime() - 30 * DAY_MS).toISOString()
      const sevenDaysAgo = now.getTime() - 7 * DAY_MS
      const [{ data: foods }, { data: acts }, { data: overrideRows }, { data: pendingRows }] = await Promise.all([
        admin.from('food_logs').select('user_id, logged_at, total_calories, nutrient_totals').in('user_id', memberIds).gte('logged_at', since),
        admin.from('activity_logs').select('user_id, logged_at, calories_burned').in('user_id', memberIds).gte('logged_at', since),
        admin.from('coach_client_settings').select('member_id, diet_override').eq('coach_id', coachId),
        admin.from('coach_message_drafts').select('member_id').eq('coach_id', coachId).in('member_id', memberIds).eq('status', 'pending'),
      ])

      const foodsByUser = new Map<string, FoodRow[]>()
      for (const f of (foods ?? []) as FoodRow[]) { const a = foodsByUser.get(f.user_id) ?? []; a.push(f); foodsByUser.set(f.user_id, a) }
      const actsByUser = new Map<string, ActivityRow[]>()
      for (const a of (acts ?? []) as ActivityRow[]) { const arr = actsByUser.get(a.user_id) ?? []; arr.push(a); actsByUser.set(a.user_id, arr) }
      const overrideByMember = new Map<string, Diet | null>()
      for (const o of overrideRows ?? []) overrideByMember.set(o.member_id as string, isDiet(o.diet_override) ? (o.diet_override as Diet) : null)
      const hasPending = new Set((pendingRows ?? []).map(r => r.member_id as string))

      let needsCount = 0

      for (const { groupId, p } of clients) {
        const userFoods = foodsByUser.get(p.id) ?? []
        const lastLoggedAt = userFoods.reduce<string | null>((max, f) => (!max || f.logged_at > max ? f.logged_at : max), null)
        const weekFoods = userFoods
          .filter(f => new Date(f.logged_at).getTime() >= sevenDaysAgo)
          .map(f => ({ logged_at: f.logged_at, total_calories: f.total_calories ?? 0, nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals) }))
        const weekActs = (actsByUser.get(p.id) ?? [])
          .filter(a => new Date(a.logged_at).getTime() >= sevenDaysAgo)
          .map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 }))

        const diet = effectiveDiet(isDiet(p.diet) ? p.diet : null, overrideByMember.get(p.id) ?? null)
        const { attention, signals, report } = assessClient({
          foods: weekFoods, activities: weekActs, calorieTarget: p.calorie_target ?? 2000, lastLoggedAt, diet,
          strings: copilotStrings,
        })
        if (attention !== 'needs_attention') continue
        needsCount++
        if (hasPending.has(p.id)) continue

        const kind = chooseKind(signals)
        const { text } = await draftCheckin({
          coachName: (coach.display_name as string) ?? 'Coach',
          coachStyle: coach.coach_style as string | null,
          memberFirstName: (p.display_name ?? 'there').trim().split(/\s+/)[0],
          kind, signals, report, diet,
        })
        await admin.from('coach_message_drafts').insert({
          group_id: groupId, coach_id: coachId, member_id: p.id, kind,
          draft_text: text, basis: { source: 'digest', signals: signals.map(s => s.label) },
        })
      }

      if (needsCount > 0) {
        const t = getDict(resolveLocale(coach.language as string | null)).pushNotify
        const body = t.coachDigestBody(needsCount)
        await admin.from('notifications').insert({ user_id: coachId, type: 'coach_nudge', data: { count: needsCount } })
        const { data: subRows } = await admin
          .from('push_subscriptions').select('subscription').eq('user_id', coachId)
        if (subRows && subRows.length) {
          const subs = subRows.map(r => r.subscription) as webpush.PushSubscription[]
          const { count: unread } = await admin
            .from('notifications').select('id', { count: 'exact', head: true })
            .eq('user_id', coachId).eq('read', false)
          pushed += await sendPushToSubscriptions(subs, {
            title: t.coachDigestTitle,
            body,
            url: '/coach/queue',
            tag: 'coach-digest',
            count: unread ?? undefined,
          })
        }
      }
    }

    await admin.from('profiles').update({ last_coach_digest_at: now.toISOString() }).eq('id', coachId)
  }

  return NextResponse.json({ ok: true, coaches: processed, sent: pushed })
}
