import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  if (!memberships?.length) {
    redirect('/group/create')
  }

  const groupIds = memberships.map(m => m.group_id)

  // Group header info (name + photo). Show the first group's identity.
  const { data: myGroups } = await supabase
    .from('groups')
    .select('id, name, photo_url')
    .in('id', groupIds)
  const headerGroup = myGroups?.[0]
    ? { name: myGroups[0].name as string, photo_url: (myGroups[0].photo_url as string | null) ?? null, count: myGroups.length }
    : null

  // Founder moderation context: the first group this user created (among the ones
  // they're in). Members of it can have their posts removed / be expelled.
  const { data: founded } = await supabase
    .from('groups')
    .select('id, name')
    .eq('created_by', user.id)
    .in('id', groupIds)
  const founderGroup = founded?.[0]
    ? { id: founded[0].id as string, name: founded[0].name as string }
    : null

  // Get group member user IDs (role included so we can mark the coach in the
  // group roster shown when you tap the group header).
  const { data: allMembers } = await supabase
    .from('group_members')
    .select('group_id, user_id, role, profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)')
    .in('group_id', groupIds)

  const memberUserIds = [...new Set(allMembers?.map(m => m.user_id) ?? [])]

  // Members of the founder's own group (minus the founder) — posts by these
  // users can be moderated, and they can be expelled.
  const moderatableUserIds = founderGroup
    ? [...new Set(
        (allMembers ?? [])
          .filter(m => m.group_id === founderGroup.id && m.user_id !== user.id)
          .map(m => m.user_id),
      )]
    : []

  // A week of feed, so small groups don't open to a ghost town. Cap the row count
  // so an active group can't blow up the initial payload (newest first).
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('food_logs')
    .select('*')
    .in('user_id', memberUserIds)
    .eq('shared_to_feed', true)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })
    .limit(100)

  // Reactions and comments for those logs, plus group members' activity logs.
  const logIds = logs?.map(l => l.id) ?? []
  const [{ data: reactions }, { data: comments }, { data: activityLogs }, { data: milestoneRows }] = await Promise.all([
    supabase.from('reactions').select('*').in('food_log_id', logIds),
    supabase.from('comments').select('*, profile:profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)').in('food_log_id', logIds),
    supabase
      .from('activity_logs')
      .select('id, user_id, activity_name, duration_minutes, distance_km, steps, calories_burned, logged_at')
      .in('user_id', memberUserIds)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(100),
    supabase
      .from('milestones')
      .select('id, user_id, type, data, created_at')
      .in('user_id', memberUserIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Build profile map
  const profileMap: Record<string, { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }> = {}
  for (const m of allMembers ?? []) {
    if (m.profiles && typeof m.profiles === 'object' && !Array.isArray(m.profiles)) {
      profileMap[m.user_id] = m.profiles as { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }
    }
  }

  const fallbackProfile = (uid: string) => profileMap[uid] ?? { id: uid, display_name: 'User', avatar_url: null, privacy_mode: 'summary', dark_mode_until: null }

  // Reactions + comments for activities (they're likeable/commentable too).
  const activityIds = (activityLogs ?? []).map(a => a.id)
  const [{ data: actReactions }, { data: actComments }] = activityIds.length
    ? await Promise.all([
        supabase.from('reactions').select('*').in('activity_log_id', activityIds),
        supabase.from('comments').select('*, profile:profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)').in('activity_log_id', activityIds),
      ])
    : [{ data: [] as { activity_log_id: string }[] }, { data: [] as { activity_log_id: string }[] }]

  // Likes on every visible comment (meals + activities) → count + whether I liked it.
  const allCommentIds = [
    ...(comments ?? []).map(c => c.id as string),
    ...(actComments ?? []).map(c => (c as { id: string }).id),
  ]
  const { data: commentLikes } = allCommentIds.length
    ? await supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', allCommentIds)
    : { data: [] as { comment_id: string; user_id: string }[] }
  const likeCount = new Map<string, number>()
  const likedByMe = new Set<string>()
  for (const l of commentLikes ?? []) {
    likeCount.set(l.comment_id, (likeCount.get(l.comment_id) ?? 0) + 1)
    if (l.user_id === user.id) likedByMe.add(l.comment_id)
  }
  const withLikes = <T extends { id: string }>(c: T) => ({
    ...c, like_count: likeCount.get(c.id) ?? 0, liked_by_me: likedByMe.has(c.id),
  })

  // Assemble feed entries
  const feedEntries = (logs ?? []).map(log => ({
    ...log,
    profile: fallbackProfile(log.user_id),
    reactions: (reactions ?? []).filter(r => r.food_log_id === log.id),
    comments: (comments ?? []).filter(c => c.food_log_id === log.id).map(withLikes),
  }))

  const activityEntries = (activityLogs ?? []).map(a => ({
    ...a,
    profile: fallbackProfile(a.user_id),
    reactions: (actReactions ?? []).filter(r => r.activity_log_id === a.id),
    comments: (actComments ?? []).filter(c => c.activity_log_id === a.id).map(withLikes),
  }))

  const milestoneEntries = (milestoneRows ?? []).map(m => ({
    ...m,
    profile: fallbackProfile(m.user_id),
  }))

  // userId -> name, for the "Liked by …" line.
  const nameMap: Record<string, string> = {}
  for (const [uid, p] of Object.entries(profileMap)) nameMap[uid] = p.display_name

  // Roster for the header group — shown when you tap the group name/logo. The
  // coach (role === 'coach') is flagged so the UI can highlight them.
  const headerGroupId = myGroups?.[0]?.id as string | undefined
  const groupMembers = (allMembers ?? [])
    .filter(m => m.group_id === headerGroupId && m.profiles && typeof m.profiles === 'object' && !Array.isArray(m.profiles))
    .map(m => {
      const p = m.profiles as unknown as { display_name: string | null; avatar_url: string | null }
      return {
        user_id: m.user_id as string,
        display_name: p.display_name ?? 'Member',
        avatar_url: p.avatar_url ?? null,
        is_coach: m.role === 'coach',
      }
    })
    // Coach first, then everyone else alphabetically.
    .sort((a, b) => (b.is_coach ? 1 : 0) - (a.is_coach ? 1 : 0) || a.display_name.localeCompare(b.display_name))

  return (
    <FeedClient
      entries={feedEntries}
      milestones={milestoneEntries}
      activities={activityEntries}
      currentUserId={user.id}
      nameMap={nameMap}
      headerGroup={headerGroup}
      groupMembers={groupMembers}
      founderGroup={founderGroup}
      moderatableUserIds={moderatableUserIds}
    />
  )
}
