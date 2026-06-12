'use client'

import { useState } from 'react'
import { Flame } from 'lucide-react'
import { kmToMiles } from '@/lib/fitness'
import MiniProfileModal from '@/components/MiniProfileModal'
import type { FeedActivityEntry } from '@/types'

const ACTIVITY_EMOJI: Record<string, string> = {
  Walking: '🚶', Running: '🏃', Cycling: '🚴', Hiking: '🥾', Swimming: '🏊',
  'Weight training': '🏋️', HIIT: '🔥', Yoga: '🧘', 'Jump rope': '🪢',
  Rowing: '🚣', Dancing: '💃', Pilates: '🤸',
}

function metric(a: FeedActivityEntry): string {
  if (a.distance_km != null) return `${kmToMiles(a.distance_km).toFixed(2)} mi`
  if (a.steps != null) return `${a.steps.toLocaleString()} steps`
  if (a.duration_minutes != null) return `${a.duration_minutes} min`
  return ''
}

export default function ActivityCard({ entry, currentUserId }: { entry: FeedActivityEntry; currentUserId: string }) {
  const [showProfile, setShowProfile] = useState(false)
  const time = new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const emoji = ACTIVITY_EMOJI[entry.activity_name] ?? '💪'
  const isOwn = entry.user_id === currentUserId

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg shadow-black/30">
      {/* Header — tap name/avatar to open the member's profile */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => !isOwn && setShowProfile(true)}
          disabled={isOwn}
          aria-label={isOwn ? undefined : `View ${entry.profile.display_name}'s profile`}
          className={`flex items-center gap-3 flex-1 min-w-0 text-left ${isOwn ? '' : 'group'}`}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-700 to-orange-900 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
            {entry.profile.avatar_url
              ? <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : entry.profile.display_name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-white font-semibold text-sm truncate ${isOwn ? '' : 'group-hover:text-orange-300 transition-colors'}`}>{entry.profile.display_name}</p>
            <p className="text-stone-400 text-xs">completed a workout · {time}</p>
          </div>
        </button>
      </div>

      {/* Activity card body */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 bg-gradient-to-br from-orange-950/50 to-stone-900 border border-orange-900/40 rounded-2xl p-4">
          <div className="w-11 h-11 rounded-xl bg-orange-900/40 flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{entry.activity_name}</p>
            {metric(entry) && <p className="text-stone-400 text-xs">{metric(entry)}</p>}
          </div>
          {entry.calories_burned > 0 && (
            <div className="text-right shrink-0">
              <p className="text-orange-400 font-bold tabular-nums flex items-center gap-1 justify-end">
                <Flame size={14} aria-hidden="true" /> {entry.calories_burned}
              </p>
              <p className="text-stone-500 text-[11px]">kcal burned</p>
            </div>
          )}
        </div>
      </div>

      {showProfile && (
        <MiniProfileModal userId={entry.user_id} name={entry.profile.display_name} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}
