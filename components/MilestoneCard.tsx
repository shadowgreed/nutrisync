'use client'

import { useState } from 'react'
import MiniProfileModal from '@/components/MiniProfileModal'
import type { FeedMilestoneEntry } from '@/types'

const CONFETTI = ['#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#f472b6']

export default function MilestoneCard({ entry, currentUserId }: { entry: FeedMilestoneEntry; currentUserId: string }) {
  const [showProfile, setShowProfile] = useState(false)
  const isOwn = entry.user_id === currentUserId
  const name = entry.profile.display_name

  let emoji = '🎉'
  let headline = 'hit a milestone'
  if (entry.type === 'streak') {
    const days = Number(entry.data?.days ?? 0)
    emoji = '🔥'
    headline = `hit a ${days}-day logging streak!`
  } else if (entry.type === 'goal_weight') {
    const pct = Number(entry.data?.pct ?? 0)
    emoji = pct >= 100 ? '🏆' : '🎯'
    headline = pct >= 100 ? 'reached their goal weight!' : `is ${pct}% to their goal weight!`
  }

  return (
    <div className="relative bg-gradient-to-br from-amber-900/40 via-stone-900 to-emerald-900/30 border border-amber-700/40 rounded-3xl overflow-hidden shadow-lg shadow-black/30 px-5 py-6 text-center">
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 w-1.5 h-2.5 rounded-[1px]"
            style={{ left: `${(i * 7 + 4) % 100}%`, background: CONFETTI[i % CONFETTI.length], animation: `confetti-fall 1.5s ${(i % 7) * 0.12}s ease-in infinite` }}
          />
        ))}
      </div>

      <span className="text-5xl block mb-2 relative" aria-hidden="true">{emoji}</span>
      <p className="text-white font-bold leading-snug">
        {isOwn ? (
          <span>You</span>
        ) : (
          <button onClick={() => setShowProfile(true)} className="underline decoration-amber-400/50 underline-offset-2 hover:text-amber-200 transition-colors">
            {name}
          </button>
        )}{' '}
        {headline}
      </p>
      <p className="text-amber-300 text-xs mt-1.5 font-medium">Milestone unlocked ✨</p>

      {showProfile && (
        <MiniProfileModal userId={entry.user_id} name={name} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}
