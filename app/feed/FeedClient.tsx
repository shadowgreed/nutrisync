'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Users } from 'lucide-react'
import FeedCard from '@/components/FeedCard'
import ActivityCard from '@/components/ActivityCard'
import NotificationBell from '@/components/NotificationBell'
import { BottomNav } from '../dashboard/DashboardClient'
import type { FeedEntry, FeedActivityEntry } from '@/types'

interface Props {
  entries: FeedEntry[]
  activities: FeedActivityEntry[]
  currentUserId: string
  nameMap: Record<string, string>
  headerGroup: { name: string; photo_url: string | null; count: number } | null
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

export default function FeedClient({ entries: initial, activities, currentUserId, nameMap, headerGroup }: Props) {
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
                    nameMap={nameMap}
                  />
                ) : (
                  <ActivityCard entry={item.activity} currentUserId={currentUserId} />
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
