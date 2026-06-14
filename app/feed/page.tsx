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

  // Get group member user IDs
  const { data: allMembers } = await supabase
    .from('group_members')
    .select('user_id, profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)')
    .in('group_id', groupIds)

  const memberUserIds = [...new Set(allMembers?.map(m => m.user_id) ?? [])]

  // A week of feed, so small groups don't open to a ghost town.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('food_logs')
    .select('*')
    .in('user_id', memberUserIds)
    .eq('shared_to_feed', true)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })

  // Reactions and comments for those logs, plus group members' activity logs.
  const logIds = logs?.map(l => l.id) ?? []
  const [{ data: reactions }, { data: comments }, { data: activityLogs }] = await Promise.all([
    supabase.from('reactions').select('*').in('food_log_id', logIds),
    supabase.from('comments').select('*, profile:profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)').in('food_log_id', logIds),
    supabase
      .from('activity_logs')
      .select('id, user_id, activity_name, duration_minutes, distance_km, steps, calories_burned, logged_at')
      .in('user_id', memberUserIds)
      .neq('source', 'apple_health') // auto-synced wearable data isn't auto-posted to the feed
      .gte('logged_at', since)
      .order('logged_at', { ascending: false }),
  ])

  // Build profile map
  const profileMap: Record<string, { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }> = {}
  for (const m of allMembers ?? []) {
    if (m.profiles && typeof m.profiles === 'object' && !Array.isArray(m.profiles)) {
      profileMap[m.user_id] = m.profiles as { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }
    }
  }

  const fallbackProfile = (uid: string) => profileMap[uid] ?? { id: uid, display_name: 'User', avatar_url: null, privacy_mode: 'summary', dark_mode_until: null }

  // Assemble feed entries
  const feedEntries = (logs ?? []).map(log => ({
    ...log,
    profile: fallbackProfile(log.user_id),
    reactions: (reactions ?? []).filter(r => r.food_log_id === log.id),
    comments: (comments ?? []).filter(c => c.food_log_id === log.id),
  }))

  const activityEntries = (activityLogs ?? []).map(a => ({
    ...a,
    profile: fallbackProfile(a.user_id),
  }))

  // userId -> name, for the "Liked by …" line.
  const nameMap: Record<string, string> = {}
  for (const [uid, p] of Object.entries(profileMap)) nameMap[uid] = p.display_name

  return (
    <FeedClient
      entries={feedEntries}
      activities={activityEntries}
      currentUserId={user.id}
      nameMap={nameMap}
      headerGroup={headerGroup}
    />
  )
}
