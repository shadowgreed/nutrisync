import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  memberSuccessDays, challengeStreak, challengeStatus, daysRemaining,
  dayIndex, totalDays, isOnTrack,
  type ChallengeMetric, type LogLike,
} from '@/lib/challenges'
import { userDayKey, todayKey, resolveTimeZone } from '@/lib/day'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import ChallengesClient, { type ChallengeView, type LeaderRow, type FeedEvent } from './ChallengesClient'

const STREAK_TIERS = [21, 14, 7, 3]
const TEAM_TIERS = [100, 75, 50, 25]

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = getDict(await getLocale())
  const tc = t.challenges

  // Find the user's group
  const { data: membership } = await supabase
    .from('group_members')
    .select('group_id, groups(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const groupId = membership?.group_id as string | undefined
  const groupName = (membership?.groups as unknown as { name: string } | null)?.name ?? null

  if (!groupId) {
    return <ChallengesClient group={null} currentUserId={user.id} challenges={[]} needsMigration={false} />
  }

  // All members of the group (id + display name + avatar)
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name, avatar_url, reminder_timezone)')
    .eq('group_id', groupId)

  const members = (memberRows ?? []).map(m => {
    const p = m.profiles as unknown as { display_name: string; avatar_url: string | null; reminder_timezone: string | null } | null
    return {
      userId: m.user_id as string,
      name: p?.display_name ?? 'Member',
      avatarUrl: p?.avatar_url ?? null,
      tz: resolveTimeZone(p?.reminder_timezone),
    }
  })
  const memberIds = members.map(m => m.userId)
  // Bucket all challenge days in the viewer's timezone (consistent for the
  // leaderboard they're looking at). Per-member zones are a future refinement.
  const viewerTz = members.find(m => m.userId === user.id)?.tz ?? resolveTimeZone(null)

  // Challenges for this group
  const { data: challengeRows, error: chErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  const needsMigration = !!chErr && (chErr.code === '42P01' || /challenges/.test(chErr.message))

  // Pull member logs once, spanning the earliest challenge start (or last 45 days)
  let earliest = new Date()
  earliest.setDate(earliest.getDate() - 45)
  for (const c of challengeRows ?? []) {
    const s = new Date(c.start_date + 'T00:00:00')
    if (s < earliest) earliest = s
  }
  const earliestIso = earliest.toISOString()

  const [{ data: foodLogs }, { data: activityLogs }, { data: waterLogs }] = memberIds.length
    ? await Promise.all([
        supabase.from('food_logs').select('user_id, logged_at, macro_totals, nutrient_totals')
          .in('user_id', memberIds).gte('logged_at', earliestIso),
        supabase.from('activity_logs').select('user_id, logged_at')
          .in('user_id', memberIds).gte('logged_at', earliestIso),
        supabase.from('water_logs').select('user_id, logged_at, amount_ml')
          .in('user_id', memberIds).gte('logged_at', earliestIso),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }] as const

  // Bucket every source by member (and water/activity into local day-keys).
  const foodByUser = new Map<string, LogLike[]>()
  for (const l of (foodLogs ?? []) as Array<{ user_id: string } & LogLike>) {
    const arr = foodByUser.get(l.user_id) ?? []
    arr.push(l)
    foodByUser.set(l.user_id, arr)
  }
  const activityDayKeysByUser = new Map<string, Set<string>>()
  const activityRowsByUser = new Map<string, string[]>()   // raw logged_at, for "today" times
  for (const a of (activityLogs ?? []) as Array<{ user_id: string; logged_at: string }>) {
    const set = activityDayKeysByUser.get(a.user_id) ?? new Set<string>()
    set.add(userDayKey(a.logged_at, viewerTz))
    activityDayKeysByUser.set(a.user_id, set)
    const rows = activityRowsByUser.get(a.user_id) ?? []
    rows.push(a.logged_at)
    activityRowsByUser.set(a.user_id, rows)
  }
  const waterMlByDayByUser = new Map<string, Map<string, number>>()
  for (const w of (waterLogs ?? []) as Array<{ user_id: string; logged_at: string; amount_ml: number }>) {
    const m = waterMlByDayByUser.get(w.user_id) ?? new Map<string, number>()
    const key = userDayKey(w.logged_at, viewerTz)
    m.set(key, (m.get(key) ?? 0) + (w.amount_ml || 0))
    waterMlByDayByUser.set(w.user_id, m)
  }

  const today = todayKey(viewerTz)

  // Latest local-today timestamp among a member's logs relevant to the metric —
  // used to order today's completions in the activity feed.
  const onToday = (ts: string) => userDayKey(ts, viewerTz) === today
  function latestTodayTime(metric: ChallengeMetric, userId: string): string | null {
    let times: string[] = []
    if (metric === 'active_days') {
      times = (activityRowsByUser.get(userId) ?? []).filter(onToday)
    } else if (metric === 'water_days') {
      times = (waterLogs ?? [])
        .filter((w: { user_id: string; logged_at: string }) => w.user_id === userId && onToday(w.logged_at))
        .map((w: { logged_at: string }) => w.logged_at)
    } else {
      times = (foodByUser.get(userId) ?? []).map(l => l.logged_at).filter(onToday)
    }
    return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null
  }

  const challenges: ChallengeView[] = (challengeRows ?? []).map(c => {
    const metric = c.metric as ChallengeMetric
    const goal = c.goal as number

    const rows = members.map(m => {
      const success = memberSuccessDays(metric, c.start_date, c.end_date, {
        food: foodByUser.get(m.userId) ?? [],
        activityDayKeys: activityDayKeysByUser.get(m.userId) ?? new Set(),
        waterMlByDayKey: waterMlByDayByUser.get(m.userId) ?? new Map(),
      }, viewerTz)
      return {
        userId: m.userId,
        name: m.name,
        avatarUrl: m.avatarUrl,
        progress: success.size,
        streak: challengeStreak(success, c.start_date, c.end_date, today),
        done: success.size >= goal,
        todayDone: success.has(today),
      }
    }).sort((a, b) => b.progress - a.progress || b.streak - a.streak)

    const leaderboard: LeaderRow[] = rows.map((r, i) => ({ ...r, rank: i + 1 }))
    const me = leaderboard.find(r => r.userId === user.id) ?? null

    const teamProgress = leaderboard.reduce((s, l) => s + Math.min(l.progress, goal), 0)
    const teamGoal = goal * Math.max(1, members.length)
    const teamPct = Math.min(100, Math.round((teamProgress / teamGoal) * 100))
    const todayCount = leaderboard.filter(r => r.todayDone).length

    // ── Derived activity feed (no events table) ──────────────────────────────
    // Real signals: challenge completions, current streak milestones, today's
    // completions (ordered by the member's latest relevant log today), and the
    // highest team-progress tier crossed.
    const feed: FeedEvent[] = []
    for (const r of leaderboard) {
      if (r.done) feed.push({ emoji: '🏆', text: tc.feed.completedChallenge(r.name) })
    }
    for (const r of leaderboard) {
      const tier = STREAK_TIERS.find(t => r.streak >= t)
      if (tier) feed.push({ emoji: '🔥', text: tc.feed.onStreak(r.name, r.streak) })
    }
    const teamTier = TEAM_TIERS.find(t => teamPct >= t)
    if (teamTier) feed.push({ emoji: '🤝', text: tc.feed.crewReached(teamTier, teamProgress, teamGoal, tc.metrics[metric].unit) })

    const todayCompleters = leaderboard
      .filter(r => r.todayDone)
      .map(r => ({ name: r.name, t: latestTodayTime(metric, r.userId) }))
      .sort((a, b) => (b.t ?? '').localeCompare(a.t ?? ''))
    for (const r of todayCompleters) feed.push({ emoji: '👏', text: tc.feed.completedToday(r.name) })

    // ── Milestone banner: the single most notable current moment ─────────────
    let banner: string | null = null
    const justDone = leaderboard.find(r => r.done)
    const topStreak = leaderboard.reduce<LeaderRow | null>((best, r) =>
      STREAK_TIERS.includes(r.streak) && (!best || r.streak > best.streak) ? r : best, null)
    if (justDone) banner = tc.feed.bannerCompleted(justDone.name)
    else if (teamTier && teamTier >= 50) banner = tc.feed.bannerCrew(teamTier)
    else if (topStreak) banner = tc.feed.bannerStreak(topStreak.name, topStreak.streak)

    return {
      id: c.id,
      title: c.title,
      metric,
      goal,
      start_date: c.start_date,
      end_date: c.end_date,
      created_by: c.created_by,
      status: challengeStatus(c.start_date, c.end_date, today),
      dayIndex: dayIndex(c.start_date, c.end_date, today),
      totalDays: totalDays(c.start_date, c.end_date),
      remaining: daysRemaining(c.end_date, today),
      leaderboard,
      me,
      teamProgress,
      teamGoal,
      teamPct,
      todayCount,
      participantCount: members.length,
      feed: feed.slice(0, 10),
      banner,
      onTrack: me ? isOnTrack(me.progress, goal, c.start_date, c.end_date, today) : false,
    }
  })

  return (
    <ChallengesClient
      group={{ id: groupId, name: groupName ?? tc.yourGroup }}
      currentUserId={user.id}
      challenges={challenges}
      needsMigration={needsMigration}
    />
  )
}
