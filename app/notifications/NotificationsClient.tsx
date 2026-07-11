'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setAppBadge } from '@/lib/badge'
import { BottomNav } from '../dashboard/DashboardClient'
import PushToggle from '@/components/PushToggle'
import { useI18n } from '@/components/I18nProvider'
import type { Dict } from '@/lib/i18n/dictionaries'
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
// else uses its static destination. A post is either a meal (food_log) or a
// workout (activity_log) — check both, since comments/reactions are polymorphic.
const POST_TYPES = new Set<NotificationType>(['reaction', 'comment', 'reply', 'meal'])
function hrefFor(n: AppNotification): string {
  if (POST_TYPES.has(n.type)) {
    if (n.food_log_id) return `/feed?post=${n.food_log_id}`
    if (n.activity_log_id) return `/feed?post=${n.activity_log_id}`
  }
  return TYPE_META[n.type].href
}

function timeAgo(iso: string, tn: Dict['notifications']): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return tn.justNow
  const m = Math.floor(s / 60)
  if (m < 60) return tn.minutesAgo(m)
  const h = Math.floor(m / 60)
  if (h < 24) return tn.hoursAgo(h)
  const d = Math.floor(h / 24)
  return d === 1 ? tn.yesterday : tn.daysAgo(d)
}

function message(n: AppNotification, t: Dict): string {
  const tn = t.notifications
  const who = n.actor?.display_name ?? tn.someone
  switch (n.type) {
    case 'reaction':   return tn.reaction(who, (n.data?.emoji as string) ?? '')
    case 'comment':    return tn.comment(who, (n.data?.text as string) ?? '')
    case 'reply':      return tn.reply(who, (n.data?.text as string) ?? '')
    case 'challenge':  return tn.challenge(who, (n.data?.title as string) ?? '')
    case 'group_join': return tn.groupJoin(who)
    case 'meal': {
      const raw = n.data?.meal_type as string | undefined
      const label = raw ? ((t.mealTypes as Record<string, { label: string }>)[raw]?.label ?? raw) : tn.mealFallback
      return tn.meal(who, label)
    }
    case 'weekly_report': return tn.weeklyReport
    case 'cheer': {
      const rid = n.data?.reaction_id as string | undefined
      const label = (rid && (t.reactions as Record<string, string>)[rid]) || (n.data?.label as string | undefined)
      const emoji = (n.data?.emoji as string | undefined) ?? '👏'
      return label ? tn.cheerLabeled(who, emoji, label) : tn.cheerPlain(who)
    }
    case 'coach_message': return tn.coachMessage(who, (n.data?.text as string) ?? '')
    case 'coach_nudge':   return tn.coachNudge(who)
    // Requesters aren't group members yet, so their profile isn't readable under
    // the scoped RLS — the name is stored on the notification itself instead.
    case 'join_request': return tn.joinRequest((n.data?.requester_name as string) ?? who, (n.data?.group_name as string) ?? tn.yourGroup)
    default:           return tn.fallback(who)
  }
}

export default function NotificationsClient({ initial }: { initial: AppNotification[] }) {
  const { t } = useI18n()
  const tn = t.notifications
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
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-safe pb-4 flex items-center gap-3">
        <Link href="/dashboard" aria-label={tn.back} className="flex items-center justify-center w-11 h-11 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-white text-2xl font-bold">{tn.title}</h1>
      </div>

      {/* Prompt to enable push — disappears once notifications are on, so the
          page is just the list. Managing/disabling lives in Settings → Account. */}
      <div className="px-4 mb-4 empty:hidden">
        <PushToggle mode="prompt" />
      </div>

      {items.length === 0 ? (
        <div className="mx-4 text-center py-16 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl">
          <Bell size={28} className="text-stone-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-stone-300 font-medium">{tn.emptyTitle}</p>
          <p className="text-stone-400 text-sm mt-1">{tn.emptyBody}</p>
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
                  <p className="text-stone-200 text-sm leading-snug">{message(n, t)}</p>
                  <p className="text-stone-400 text-xs mt-0.5">{timeAgo(n.created_at, tn)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" aria-label={tn.unread} />}
              </Link>
            )
          })}
        </div>
      )}

      <BottomNav active="" />
    </div>
  )
}
