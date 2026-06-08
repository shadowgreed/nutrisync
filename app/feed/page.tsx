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

  // Get group member user IDs
  const { data: allMembers } = await supabase
    .from('group_members')
    .select('user_id, profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)')
    .in('group_id', groupIds)

  const memberUserIds = [...new Set(allMembers?.map(m => m.user_id) ?? [])]

  // Today's + yesterday's feed (last 36 hours)
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  const { data: logs } = await supabase
    .from('food_logs')
    .select('*')
    .in('user_id', memberUserIds)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })

  // Reactions and comments for those logs
  const logIds = logs?.map(l => l.id) ?? []
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from('reactions').select('*').in('food_log_id', logIds),
    supabase.from('comments').select('*, profiles(id, display_name, avatar_url, privacy_mode, dark_mode_until)').in('food_log_id', logIds),
  ])

  // Build profile map
  const profileMap: Record<string, { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }> = {}
  for (const m of allMembers ?? []) {
    if (m.profiles && typeof m.profiles === 'object' && !Array.isArray(m.profiles)) {
      profileMap[m.user_id] = m.profiles as { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }
    }
  }

  // Assemble feed entries
  const feedEntries = (logs ?? []).map(log => ({
    ...log,
    profile: profileMap[log.user_id] ?? { id: log.user_id, display_name: 'User', avatar_url: null, privacy_mode: 'summary', dark_mode_until: null },
    reactions: (reactions ?? []).filter(r => r.food_log_id === log.id),
    comments: (comments ?? []).filter(c => c.food_log_id === log.id),
  }))

  return <FeedClient entries={feedEntries} currentUserId={user.id} />
}
