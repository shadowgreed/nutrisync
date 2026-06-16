import { NextRequest, NextResponse } from 'next/server'
import type webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push'
import { assessClient } from '@/lib/copilot'
import { chooseKind, draftCheckin } from '@/lib/copilot-ai'
import { computeStreak } from '@/lib/streak'
import type { NutrientTotals } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY_MS = 24 * 60 * 60 * 1000

interface FoodRow { user_id: string; logged_at: string; total_calories: number | null; nutrient_totals: NutrientTotals | null }
interface ActivityRow { user_id: string; logged_at: string; calories_burned: number | null }

/**
 * Daily coach digest. For every coach-plan group, assess each member, pre-build a
 * pending Copilot draft for those who need attention, and push the coach a single
 * "N clients need a check-in" nudge (in-app + best-effort web push). Drafts stay
 * `pending` — the cron NEVER sends anything to a member; only an explicit coach
 * send does. Throttled to once per ~day per coach via profiles.last_coach_digest_at.
 *
 * Schedule hourly via pg_cron (like the reminders/weekly-report crons); it fires
 * for whichever coach is currently at ~8am local and hasn't been digested today.
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

  // Coaches of coach-plan groups, with their timezone + last-digest throttle.
  const { data: coachRows, error } = await supabase
    .from('group_members')
    .select('user_id, group_id, groups!inner(id, name, plan), profiles!inner(reminder_timezone, last_coach_digest_at)')
    .eq('role', 'coach')
    .eq('groups.plan', 'coach')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group the coach-plan groups by coach.
  const byCoach = new Map<string, { groupIds: string[]; tz: string; lastAt: string | null }>()
  for (const r of coachRows ?? []) {
    const coachId = r.user_id as string
    const prof = r.profiles as unknown as { reminder_timezone: string | null; last_coach_digest_at: string | null } | null
    const entry = byCoach.get(coachId) ?? { groupIds: [], tz: prof?.reminder_timezone || 'America/New_York', lastAt: prof?.last_coach_digest_at ?? null }
    entry.groupIds.push(r.group_id as string)
    byCoach.set(coachId, entry)
  }

  const twentyHoursMs = 20 * 60 * 60 * 1000
  let coachesNudged = 0
  let draftsBuilt = 0
  let pushed = 0

  for (const [coachId, info] of byCoach) {
    // Fire at ~8am local, once per day.
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: info.tz, hour: '2-digit', hour12: false }).format(now)) % 24
    if (hour !== 8) continue
    if (info.lastAt && now.getTime() - new Date(info.lastAt).getTime() < twentyHoursMs) continue

    // Members across this coach's coach-plan groups (minus the coach), de-duped.
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, group_id, profiles(id, display_name, calorie_target, privacy_mode, coach_visible, coach_style)')
      .in('group_id', info.groupIds)
      .neq('user_id', coachId)

    const seen = new Set<string>()
    const members = (memberRows ?? []).filter(m => {
      if (seen.has(m.user_id as string)) return false
      seen.add(m.user_id as string)
      return true
    })

    if (members.length === 0) {
      await supabase.from('profiles').update({ last_coach_digest_at: now.toISOString() }).eq('id', coachId)
      continue
    }

    const memberIds = members.map(m => m.user_id as string)
    const since = new Date(now.getTime() - 30 * DAY_MS).toISOString()
    const sevenDaysAgo = now.getTime() - 7 * DAY_MS
    const [{ data: foods }, { data: acts }, { data: coachProfile }] = await Promise.all([
      supabase.from('food_logs').select('user_id, logged_at, total_calories, nutrient_totals').in('user_id', memberIds).gte('logged_at', since),
      supabase.from('activity_logs').select('user_id, logged_at, calories_burned').in('user_id', memberIds).gte('logged_at', since),
      supabase.from('profiles').select('display_name, coach_style').eq('id', coachId).single(),
    ])

    const foodsByUser = new Map<string, FoodRow[]>()
    for (const f of (foods ?? []) as FoodRow[]) { const a = foodsByUser.get(f.user_id) ?? []; a.push(f); foodsByUser.set(f.user_id, a) }
    const actsByUser = new Map<string, ActivityRow[]>()
    for (const a of (acts ?? []) as ActivityRow[]) { const arr = actsByUser.get(a.user_id) ?? []; arr.push(a); actsByUser.set(a.user_id, arr) }

    let needsCount = 0

    for (const m of members) {
      const p = m.profiles as unknown as {
        id: string; display_name: string | null; calorie_target: number | null
        privacy_mode: string | null; coach_visible: boolean | null
      } | null
      if (!p) continue
      // Honor the member's opt-out everywhere new.
      if (p.privacy_mode === 'dark' || p.coach_visible === false) continue

      const userFoods = foodsByUser.get(m.user_id as string) ?? []
      const userActs = actsByUser.get(m.user_id as string) ?? []
      const lastLoggedAt = userFoods.reduce<string | null>((max, f) => (!max || f.logged_at > max ? f.logged_at : max), null)

      const weekFoods = userFoods.filter(f => new Date(f.logged_at).getTime() >= sevenDaysAgo)
        .map(f => ({ logged_at: f.logged_at, total_calories: f.total_calories ?? 0, nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals) }))
      const weekActs = userActs.filter(a => new Date(a.logged_at).getTime() >= sevenDaysAgo)
        .map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 }))

      const { attention, signals, report } = assessClient({
        foods: weekFoods, activities: weekActs, calorieTarget: p.calorie_target ?? 2000, lastLoggedAt, now,
      })

      // Pre-draft only for members who need attention or earned praise — not routine on-track.
      const worthDrafting = attention !== 'on_track' || signals.some(s => s.code === 'strong_week')
      if (!worthDrafting) continue
      if (attention !== 'on_track') needsCount++

      // Skip if a pending draft already exists (don't churn the coach's queue).
      const { data: existing } = await supabase
        .from('coach_message_drafts')
        .select('id').eq('coach_id', coachId).eq('member_id', m.user_id as string).eq('status', 'pending').limit(1).maybeSingle()
      if (existing) continue

      const groupId = (m.group_id as string)
      const kind = chooseKind(signals)
      const { text } = await draftCheckin({
        coachName: (coachProfile?.display_name as string) ?? 'Coach',
        coachStyle: (coachProfile?.coach_style as string | null) ?? null,
        memberFirstName: (p.display_name ?? 'there').trim().split(/\s+/)[0],
        kind, signals, report,
      })

      const { error: insErr } = await supabase.from('coach_message_drafts').insert({
        group_id: groupId, coach_id: coachId, member_id: m.user_id as string, kind,
        draft_text: text,
        basis: { attention, signals: signals.map(s => s.label), source: 'digest' },
      })
      if (!insErr) draftsBuilt++
    }

    // Nudge the coach (in-app + web push), then mark digested.
    const { count: pendingCount } = await supabase
      .from('coach_message_drafts').select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId).eq('status', 'pending')

    if (needsCount > 0 || (pendingCount ?? 0) > 0) {
      const n = pendingCount ?? needsCount
      await supabase.from('notifications').insert({
        user_id: coachId, type: 'coach_nudge',
        data: { count: n, needs: needsCount },
      })
      coachesNudged++

      const { data: subRows } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', coachId)
      if (subRows && subRows.length) {
        const { count: unread } = await supabase.from('notifications')
          .select('id', { count: 'exact', head: true }).eq('user_id', coachId).eq('read', false)
        pushed += await sendPushToSubscriptions(subRows.map(r => r.subscription) as webpush.PushSubscription[], {
          title: '🧑‍🏫 Coach check-in',
          body: `${n} client${n === 1 ? '' : 's'} ${n === 1 ? 'has' : 'have'} a draft ready to review.`,
          url: '/coach/queue',
          tag: 'coach-digest',
          count: unread ?? undefined,
        })
      }
    }

    await supabase.from('profiles').update({ last_coach_digest_at: now.toISOString() }).eq('id', coachId)
  }

  return NextResponse.json({ ok: true, coachesNudged, draftsBuilt, pushed })
}
