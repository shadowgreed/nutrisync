'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Users, ArrowUp } from 'lucide-react'
import FeedCard from '@/components/FeedCard'
import ActivityCard from '@/components/ActivityCard'
import MilestoneCard from '@/components/MilestoneCard'
import NotificationBell from '@/components/NotificationBell'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '../dashboard/DashboardClient'
import type { FeedEntry, FeedActivityEntry, FeedMilestoneEntry, Comment } from '@/types'

interface Props {
  entries: FeedEntry[]
  activities: FeedActivityEntry[]
  milestones: FeedMilestoneEntry[]
  currentUserId: string
  nameMap: Record<string, string>
  headerGroup: { name: string; photo_url: string | null; count: number } | null
  founderGroup: { id: string; name: string } | null
  moderatableUserIds: string[]
}

// "Today" / "Yesterday" / "Mon, Jun 9" for the day separators.
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const key = (x: Date) => x.toLocaleDateString('en-CA')
  const yest = new Date(today); yest.setDate(today.getDate() - 1)
  if (key(d) === key(today)) return 'Today'
  if (key(d) === key(yest)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function FeedClient({ entries: initial, activities, milestones, currentUserId, nameMap, headerGroup, founderGroup, moderatableUserIds }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<FeedEntry[]>(initial)
  const [activityList, setActivityList] = useState<FeedActivityEntry[]>(activities)
  const canModerate = (userId: string) => moderatableUserIds.includes(userId)
  const [newCount, setNewCount] = useState(0)
  const [hasUpdates, setHasUpdates] = useState(false)

  // Apply server data on refresh (e.g. after tapping the "new posts" pill).
  useEffect(() => { setEntries(initial) }, [initial])
  useEffect(() => { setActivityList(activities) }, [activities])

  // Like / unlike a comment (works for meal + activity comments — ids are unique,
  // so we map over both lists). Optimistic; the row write is best-effort.
  async function toggleCommentLike(commentId: string, liked: boolean) {
    const apply = <T extends { comments: Comment[] }>(item: T): T => ({
      ...item,
      comments: item.comments.map(c => c.id === commentId
        ? { ...c, liked_by_me: !liked, like_count: Math.max(0, (c.like_count ?? 0) + (liked ? -1 : 1)) }
        : c),
    })
    setEntries(prev => prev.map(apply))
    setActivityList(prev => prev.map(apply))
    const supabase = createClient()
    if (liked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
    }
  }

  // Live feed: realtime is RLS-gated, so we only receive group members' rows.
  // New posts bump a counter (shown as a pill); reactions/comments flag updates.
  // Tapping the pill refreshes to pull everything in.
  useEffect(() => {
    const supabase = createClient()
    const isOther = (row: Record<string, unknown> | undefined) => row && row.user_id !== currentUserId
    const channel = supabase
      .channel('feed-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_logs' }, p => {
        const r = p.new as Record<string, unknown>
        if (isOther(r) && r.shared_to_feed !== false) setNewCount(c => c + 1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, p => {
        if (isOther(p.new as Record<string, unknown>)) setNewCount(c => c + 1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, p => {
        if (isOther(p.new as Record<string, unknown>)) setHasUpdates(true)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, p => {
        if (isOther(p.new as Record<string, unknown>)) setHasUpdates(true)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'milestones' }, p => {
        if (isOther(p.new as Record<string, unknown>)) setNewCount(c => c + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  function refreshFeed() {
    setNewCount(0)
    setHasUpdates(false)
    router.refresh()
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fire-and-forget push (in-app notification is created by a DB trigger).
  function notifyPush(logId: string, kind: 'reaction' | 'comment' | 'reply', targetUserId?: string) {
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodLogId: logId, kind, targetUserId }),
    }).catch(() => {})
  }

  async function handleReact(logId: string, emoji: string) {
    const existing = entries
      .find(e => e.id === logId)
      ?.reactions.find(r => r.user_id === currentUserId)

    if (existing?.emoji === emoji) {
      await fetch(`/api/reactions?food_log_id=${logId}`, { method: 'DELETE' })
      setEntries(prev => prev.map(e =>
        e.id === logId
          ? { ...e, reactions: e.reactions.filter(r => r.user_id !== currentUserId) }
          : e,
      ))
    } else {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_log_id: logId, emoji }),
      })
      const { reaction } = await res.json()
      if (reaction) {
        setEntries(prev => prev.map(e =>
          e.id === logId
            ? { ...e, reactions: [...e.reactions.filter(r => r.user_id !== currentUserId), reaction] }
            : e,
        ))
        notifyPush(logId, 'reaction')
      }
    }
  }

  async function handleDelete(logId: string) {
    const res = await fetch(`/api/log-meal?id=${logId}`, { method: 'DELETE' })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== logId))
    }
  }

  async function handleEdit(logId: string, patch: { caption?: string; meal_type?: string }) {
    const res = await fetch('/api/log-meal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: logId, ...patch }),
    })
    if (res.ok) {
      setEntries(prev => prev.map(e =>
        e.id === logId
          ? {
              ...e,
              caption: patch.caption !== undefined ? (patch.caption.trim() || null) : e.caption,
              meal_type: (patch.meal_type as typeof e.meal_type) ?? e.meal_type,
            }
          : e,
      ))
    }
  }

  async function handleComment(logId: string, text: string, parentId?: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    // Get current user so we can set user_id (required by RLS)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('comments')
      .insert({ food_log_id: logId, text, user_id: user.id, parent_id: parentId ?? null })
      .select('id, user_id, food_log_id, text, created_at, parent_id, profile:user_id(id, display_name, avatar_url, privacy_mode, dark_mode_until)')
      .single()

    if (error) {
      console.error('comment error:', error.message)
      return
    }

    if (data) {
      // Find the parent comment's author so a reply pushes the right person.
      const parentAuthor = parentId
        ? entries.find(e => e.id === logId)?.comments.find(c => c.id === parentId)?.user_id
        : undefined
      setEntries(prev => prev.map(e =>
        e.id === logId
          ? { ...e, comments: [...e.comments, data as any] }
          : e,
      ))
      if (parentId) notifyPush(logId, 'reply', parentAuthor)
      else notifyPush(logId, 'comment')
    }
  }

  async function handleDeleteComment(logId: string, commentId: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) { console.error('delete comment error:', error.message); return }
    // Drop the comment and any of its replies (DB cascades; mirror it in state).
    setEntries(prev => prev.map(e =>
      e.id === logId
        ? { ...e, comments: e.comments.filter(c => c.id !== commentId && c.parent_id !== commentId) }
        : e,
    ))
  }

  // ── Activity social (in-app notifications come from DB triggers) ──
  async function handleActivityReact(activityId: string, emoji: string) {
    const mine = activityList.find(a => a.id === activityId)?.reactions.some(r => r.user_id === currentUserId)
    if (mine) {
      await fetch(`/api/reactions?activity_log_id=${activityId}`, { method: 'DELETE' })
      setActivityList(prev => prev.map(a => a.id === activityId ? { ...a, reactions: a.reactions.filter(r => r.user_id !== currentUserId) } : a))
    } else {
      const res = await fetch('/api/reactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_log_id: activityId, emoji }),
      })
      const { reaction } = await res.json()
      if (reaction) {
        setActivityList(prev => prev.map(a => a.id === activityId
          ? { ...a, reactions: [...a.reactions.filter(r => r.user_id !== currentUserId), reaction] }
          : a))
      }
    }
  }

  async function handleActivityComment(activityId: string, text: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('comments')
      .insert({ activity_log_id: activityId, text, user_id: user.id })
      .select('id, user_id, food_log_id, activity_log_id, text, created_at, parent_id, profile:user_id(id, display_name, avatar_url, privacy_mode, dark_mode_until)')
      .single()
    if (error) { console.error('activity comment error:', error.message); return }
    if (data) {
      setActivityList(prev => prev.map(a => a.id === activityId ? { ...a, comments: [...a.comments, data as unknown as FeedActivityEntry['comments'][number]] } : a))
    }
  }

  async function handleActivityDeleteComment(activityId: string, commentId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) { console.error('delete activity comment error:', error.message); return }
    setActivityList(prev => prev.map(a => a.id === activityId ? { ...a, comments: a.comments.filter(c => c.id !== commentId) } : a))
  }

  // Founder moderation: remove a member's activity post.
  async function handleActivityDelete(activityId: string) {
    const res = await fetch(`/api/log-activity?id=${activityId}`, { method: 'DELETE' })
    if (res.ok) setActivityList(prev => prev.filter(a => a.id !== activityId))
  }

  // Founder moderation: expel a member from the group; drop their content locally.
  async function handleRemoveMember(userId: string) {
    if (!founderGroup) return
    const res = await fetch('/api/group/remove-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: founderGroup.id, userId }),
    })
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.user_id !== userId))
      setActivityList(prev => prev.filter(a => a.user_id !== userId))
      router.refresh()
    }
  }

  // Merge meals + activities + milestones into one timeline, newest first.
  const timeline = [
    ...entries.map(e => ({ kind: 'meal' as const, id: `m-${e.id}`, logged_at: e.logged_at, meal: e })),
    ...activityList.map(a => ({ kind: 'activity' as const, id: `a-${a.id}`, logged_at: a.logged_at, activity: a })),
    ...milestones.map(m => ({ kind: 'milestone' as const, id: `ms-${m.id}`, logged_at: m.created_at, milestone: m })),
  ].sort((x, y) => y.logged_at.localeCompare(x.logged_at))
  const isEmpty = timeline.length === 0

  // Track the day boundary so we can drop a separator between days.
  let lastDay = ''

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center overflow-hidden shrink-0">
            {headerGroup?.photo_url
              ? <img src={headerGroup.photo_url} alt="" className="w-full h-full object-cover" />
              : <Users size={20} className="text-emerald-300" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-xl font-bold truncate">{headerGroup?.name ?? 'Group feed'}</h1>
            <p className="text-stone-400 text-xs">{headerGroup && headerGroup.count > 1 ? `${headerGroup.count} groups` : 'This week'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/challenges"
            aria-label="Challenges"
            className="flex items-center justify-center w-11 h-11 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/40 text-amber-300 rounded-xl transition-colors"
          >
            <Trophy size={18} aria-hidden="true" />
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* Live "new posts" pill */}
      {(newCount > 0 || hasUpdates) && (
        <button
          onClick={refreshFeed}
          className="fixed top-[4.25rem] left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold pl-3 pr-4 py-2 rounded-full shadow-lg shadow-emerald-900/40 transition-colors active:scale-95"
        >
          <ArrowUp size={15} aria-hidden="true" />
          {newCount > 0 ? `${newCount} new ${newCount === 1 ? 'post' : 'posts'}` : 'New activity'}
        </button>
      )}

      <div className="px-4 space-y-3">
        {isEmpty ? (
          <div className="text-center py-16 px-6 bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl">
            <p className="text-4xl mb-3">🥗</p>
            <p className="text-white font-semibold">Nothing logged this week</p>
            <p className="text-stone-400 text-sm mt-1 mb-5">Share a meal or a workout to kick off your group.</p>
            <Link
              href="/log"
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
            >
              Log your first post
            </Link>
          </div>
        ) : (
          timeline.map(item => {
            const label = dayLabel(item.logged_at)
            const showSep = label !== lastDay
            lastDay = label
            return (
              <div key={item.id} className="space-y-3">
                {showSep && (
                  <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider pt-2 px-1">{label}</p>
                )}
                {item.kind === 'meal' ? (
                  <FeedCard
                    entry={item.meal}
                    currentUserId={currentUserId}
                    onReact={handleReact}
                    onComment={handleComment}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onDeleteComment={handleDeleteComment}
                    onLikeComment={toggleCommentLike}
                    nameMap={nameMap}
                    canModerate={canModerate(item.meal.user_id)}
                    moderationGroup={founderGroup}
                    onRemoveMember={handleRemoveMember}
                  />
                ) : item.kind === 'activity' ? (
                  <ActivityCard
                    entry={item.activity}
                    currentUserId={currentUserId}
                    onReact={handleActivityReact}
                    onComment={handleActivityComment}
                    onDeleteComment={handleActivityDeleteComment}
                    onLikeComment={toggleCommentLike}
                    canModerate={canModerate(item.activity.user_id)}
                    moderationGroup={founderGroup}
                    onDelete={handleActivityDelete}
                    onRemoveMember={handleRemoveMember}
                  />
                ) : (
                  <MilestoneCard entry={item.milestone} currentUserId={currentUserId} />
                )}
              </div>
            )
          })
        )}
      </div>
      <BottomNav active="feed" />
    </div>
  )
}
