import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeMemberProgress, type ChallengeMetric, type LogLike } from '@/lib/challenges'
import ChallengesClient, { type ChallengeView, type LeaderRow } from './ChallengesClient'

export default async function ChallengesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
    .select('user_id, profiles(display_name, avatar_url)')
    .eq('group_id', groupId)

  const members = (memberRows ?? []).map(m => {
    const p = m.profiles as unknown as { display_name: string; avatar_url: string | null } | null
    return {
      userId: m.user_id as string,
      name: p?.display_name ?? 'Member',
      avatarUrl: p?.avatar_url ?? null,
    }
  })
  const memberIds = members.map(m => m.userId)

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

  const { data: logs } = memberIds.length
    ? await supabase
        .from('food_logs')
        .select('user_id, logged_at, macro_totals, nutrient_totals')
        .in('user_id', memberIds)
        .gte('logged_at', earliest.toISOString())
    : { data: [] as Array<{ user_id: string } & LogLike> }

  const logsByUser = new Map<string, LogLike[]>()
  for (const l of (logs ?? []) as Array<{ user_id: string } & LogLike>) {
    const arr = logsByUser.get(l.user_id) ?? []
    arr.push(l)
    logsByUser.set(l.user_id, arr)
  }

  const challenges: ChallengeView[] = (challengeRows ?? []).map(c => {
    const leaderboard: LeaderRow[] = members.map(m => {
      const progress = computeMemberProgress(
        logsByUser.get(m.userId) ?? [],
        c.metric as ChallengeMetric,
        c.start_date,
        c.end_date,
      )
      return { userId: m.userId, name: m.name, avatarUrl: m.avatarUrl, progress, done: progress >= c.goal }
    }).sort((a, b) => b.progress - a.progress)

    const teamProgress = leaderboard.reduce((s, l) => s + Math.min(l.progress, c.goal), 0)
    const teamGoal = c.goal * Math.max(1, members.length)

    return {
      id: c.id,
      title: c.title,
      metric: c.metric,
      goal: c.goal,
      start_date: c.start_date,
      end_date: c.end_date,
      created_by: c.created_by,
      leaderboard,
      teamProgress,
      teamGoal,
    }
  })

  return (
    <ChallengesClient
      group={{ id: groupId, name: groupName ?? 'Your group' }}
      currentUserId={user.id}
      challenges={challenges}
      needsMigration={needsMigration}
    />
  )
}
