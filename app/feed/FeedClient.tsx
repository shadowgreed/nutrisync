'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import FeedCard from '@/components/FeedCard'
import ActivityCard from '@/components/ActivityCard'
import NotificationBell from '@/components/NotificationBell'
import { BottomNav } from '../dashboard/DashboardClient'
import type { FeedEntry, FeedActivityEntry } from '@/types'

interface Props {
  entries: FeedEntry[]
  activities: FeedActivityEntry[]
  currentUserId: string
}

export default function FeedClient({ entries: initial, activities, currentUserId }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>(initial)

  // Fire-and-forget push to the meal owner (in-app notification is created by a DB trigger)
  function notifyPush(logId: string, kind: 'reaction' | 'comment') {
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodLogId: logId, kind }),
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

  async function handleComment(logId: string, text: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    // Get current user so we can set user_id (required by RLS)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('comments')
      .insert({ food_log_id: logId, text, user_id: user.id })
      .select('id, user_id, food_log_id, text, created_at, profile:user_id(id, display_name, avatar_url, privacy_mode, dark_mode_until)')
      .single()

    if (error) {
      console.error('comment error:', error.message)
      return
    }

    if (data) {
      setEntries(prev => prev.map(e =>
        e.id === logId
          ? { ...e, comments: [...e.comments, data as any] }
          : e,
      ))
      notifyPush(logId, 'comment')
    }
  }

  // Merge meals + activities into one timeline, newest first.
  const timeline = [
    ...entries.map(e => ({ kind: 'meal' as const, id: `m-${e.id}`, logged_at: e.logged_at, meal: e })),
    ...activities.map(a => ({ kind: 'activity' as const, id: `a-${a.id}`, logged_at: a.logged_at, activity: a })),
  ].sort((x, y) => y.logged_at.localeCompare(x.logged_at))

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm">Last 36 hours</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">Group feed</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/challenges"
            className="flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/40 text-amber-300 text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Trophy size={15} aria-hidden="true" /> Challenges
          </Link>
          <NotificationBell />
        </div>
      </div>

      <div className="px-4 space-y-3">
        {entries.length === 0 && activities.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-3xl mb-3">🌿</p>
            <p className="font-medium">Nothing logged yet</p>
            <p className="text-sm mt-1">Be the first to share a meal or workout</p>
          </div>
        )}
        {timeline.map(item =>
          item.kind === 'meal' ? (
            <FeedCard
              key={item.id}
              entry={item.meal}
              currentUserId={currentUserId}
              onReact={handleReact}
              onComment={handleComment}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ) : (
            <ActivityCard key={item.id} entry={item.activity} />
          ),
        )}
      </div>
      <BottomNav active="feed" />
    </div>
  )
}
