'use client'

import { useEffect, useState } from 'react'
import { X, Flame, CalendarCheck, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { computeStreak } from '@/lib/streak'
import { kgToLbs, GOAL_LABELS, GOAL_EMOJIS } from '@/lib/fitness'
import type { Goal } from '@/types'

interface MiniData {
  goals: Goal[]
  weightKg: number | null
  targetKg: number | null
  streak: number
  daysThisWeek: number
  avatarUrl: string | null
}

export default function MiniProfileModal({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const [data, setData] = useState<MiniData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const sixtyAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    ;(async () => {
      const [{ data: profile }, { data: logs7 }, { data: logs60 }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('food_logs').select('logged_at').eq('user_id', userId).gte('logged_at', weekAgo),
        supabase.from('food_logs').select('logged_at').eq('user_id', userId).gte('logged_at', sixtyAgo),
      ])
      const goals: Goal[] = (profile?.goals as Goal[] | null) ?? (profile?.goal ? [profile.goal as Goal] : [])
      const daysThisWeek = new Set((logs7 ?? []).map(l => (l.logged_at as string).slice(0, 10))).size
      const streak = computeStreak((logs60 ?? []).map(l => l.logged_at as string))
      setData({
        goals,
        weightKg: (profile?.weight_kg as number) ?? null,
        targetKg: (profile?.target_weight_kg as number) ?? null,
        streak,
        daysThisWeek,
        avatarUrl: (profile?.avatar_url as string) ?? null,
      })
      setLoading(false)
    })()
  }, [userId])

  const weightLine = data && data.weightKg && data.targetKg
    ? `${kgToLbs(data.weightKg)} → ${kgToLbs(data.targetKg)} lbs · ${Math.abs(kgToLbs(data.weightKg) - kgToLbs(data.targetKg)).toFixed(0)} lbs to go`
    : data?.weightKg ? `${kgToLbs(data.weightKg)} lbs` : null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xs bg-stone-900 border border-stone-700 rounded-3xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden">
            {data?.avatarUrl
              ? <img src={data.avatarUrl} alt="" className="w-full h-full object-cover" />
              : (name[0]?.toUpperCase() ?? '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{name}</p>
            <p className="text-stone-400 text-xs">Group member</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center w-9 h-9 -mr-1 -mt-1 text-stone-400 hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <p className="text-stone-400 text-sm text-center py-6">Loading…</p>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Goals */}
            {data && data.goals.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.goals.map(g => (
                  <span key={g} className="inline-flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                    <span aria-hidden="true">{GOAL_EMOJIS[g]}</span> {GOAL_LABELS[g]}
                  </span>
                ))}
              </div>
            )}

            {/* Progress stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-stone-800/60 rounded-xl p-3 text-center">
                <Flame size={15} className="text-orange-400 mx-auto mb-1" aria-hidden="true" />
                <p className="text-white font-bold tabular-nums">{data?.streak ?? 0}</p>
                <p className="text-stone-400 text-[11px]">day streak</p>
              </div>
              <div className="bg-stone-800/60 rounded-xl p-3 text-center">
                <CalendarCheck size={15} className="text-emerald-400 mx-auto mb-1" aria-hidden="true" />
                <p className="text-white font-bold tabular-nums">{data?.daysThisWeek ?? 0}<span className="text-stone-400 text-xs font-normal">/7</span></p>
                <p className="text-stone-400 text-[11px]">logged this week</p>
              </div>
            </div>

            {weightLine && (
              <div className="bg-stone-800/60 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Target size={15} className="text-sky-400 shrink-0" aria-hidden="true" />
                <span className="text-stone-200 text-xs">{weightLine}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
