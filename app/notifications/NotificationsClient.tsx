'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setAppBadge } from '@/lib/badge'
import { BottomNav } from '../dashboard/DashboardClient'
import PushToggle from '@/components/PushToggle'
import ReminderSettings from '@/components/ReminderSettings'
import type { AppNotification, NotificationType } from '@/types'

const TYPE_META: Record<NotificationType, { emoji: string; href: string }> = {
  reaction:   { emoji: '❤️', href: '/feed' },
  comment:    { emoji: '💬', href: '/feed' },
  challenge:  { emoji: '🏆', href: '/challenges' },
  group_join: { emoji: '👋', href: '/feed' },
  meal:       { emoji: '🍽️', href: '/feed' },
  weekly_report: { emoji: '📊', href: '/weekly' },
  cheer:      { emoji: '👏', href: '/dashboard' },
  join_request: { emoji: '🙋', href: '/profile' },
  reply:      { emoji: '↩️', href: '/feed' },
  coach_message: { emoji: '🧑‍🏫', href: '/feed' },
  coach_nudge:   { emoji: '📣', href: '/dashboard' },
}

// Post-related notifications deep-link to the exact post on the feed; everything
// else uses its static destination.
const POST_TYPES = new Set<NotificationType>(['reaction', 'comment', 'reply', 'meal'])
function hrefFor(n: AppNotification): string {
  if (n.food_log_id && POST_TYPES.has(n.type)) return `/feed?post=${n.food_log_id}`
  return TYPE_META[n.type].href
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

function message(n: AppNotification): string {
  const who = n.actor?.display_name ?? 'Someone'
  switch (n.type) {
    case 'reaction':   return `${who} reacted ${(n.data?.emoji as string) ?? ''} to your meal`
    case 'comment':    return `${who} commented: “${(n.data?.text as string) ?? ''}”`
    case 'reply':      return `${who} replied: “${(n.data?.text as string) ?? ''}”`
    case 'challenge':  return `${who} started a challenge: ${(n.data?.title as string) ?? ''}`
    case 'group_join': return `${who} joined your group`
    case 'meal':       return `${who} logged ${(n.data?.meal_type as string) ?? 'a meal'}`
    case 'weekly_report': return 'Your weekly report is ready — see how your week went 📊'
    case 'cheer':      return `${who} cheered you on — keep it up! 👏`
    case 'coach_message': return `${who} sent you a check-in: “${(n.data?.text as string) ?? ''}”`
    case 'coach_nudge':   return `${who} sent your group a nudge 📣`
    // Requesters aren't group members yet, so their profile isn't readable under
    // the scoped RLS — the name is stored on the notification itself instead.
    case 'join_request': return `${(n.data?.requester_name as string) ?? who} wants to join ${(n.data?.group_name as string) ?? 'your group'} — review in Profile`
    default:           return `${who} did something`
  }
}

export default function NotificationsClient({ initial }: { initial: AppNotification[] }) {
  const [items] = useState<AppNotification[]>(initial)

  // Mark everything read when the page opens (clears the bell badge + app-icon
  // badge on return).
  useEffect(() => {
    setAppBadge(0)
    const unreadIds = initial.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    const supabase = createClient()
    supabase.from('notifications').update({ read: true }).in('id', unreadIds).then(() => {})
  }, [initial])

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back" className="flex items-center justify-center w-11 h-11 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-white text-2xl font-bold">Notifications</h1>
      </div>

      <PushToggle />
      <ReminderSettings />

      {items.length === 0 ? (
        <div className="mx-4 text-center py-16 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl">
          <Bell size={28} className="text-stone-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-stone-300 font-medium">No notifications yet</p>
          <p className="text-stone-400 text-sm mt-1">Meals, reactions, comments and challenges from your group will show up here.</p>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {items.map(n => {
            const meta = TYPE_META[n.type]
            return (
              <Link
                key={n.id}
                href={hrefFor(n)}
                className={`flex items-start gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                  n.read
                    ? 'bg-stone-900 border-stone-800 hover:border-stone-700'
                    : 'bg-emerald-950/30 border-emerald-800/40 hover:border-emerald-700/60'
                }`}
              >
                <span className="text-xl shrink-0" aria-hidden="true">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-stone-200 text-sm leading-snug">{message(n)}</p>
                  <p className="text-stone-400 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" aria-label="unread" />}
              </Link>
            )
          })}
        </div>
      )}

      <BottomNav active="" />
    </div>
  )
}
