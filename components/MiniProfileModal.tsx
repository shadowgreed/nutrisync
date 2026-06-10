'use client'

import { useEffect, useState } from 'react'
import { X, Flame, CalendarCheck, Target, Utensils, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { computeStreak } from '@/lib/streak'
import { GOAL_LABELS, GOAL_EMOJIS } from '@/lib/fitness'
import { kgToLbs } from '@/lib/fitness'
import { ACTIVE_DAYS_GOAL } from '@/lib/weekly'
import type { Goal } from '@/types'

interface MiniData {
  goals: Goal[]
  lbsToGo: number | null
  streak: number
  myStreak: number
  daysThisWeek: number
  avatarUrl: string | null
  memberSince: string | null
  totalMeals: number
  todayMeals: string[]
  todayActivities: string[]
  avgKcal: number | null
  kcalTarget: number | null
  activeDays: number
  photos: string[]
}

const localDay = (ts: string) => new Date(ts).toLocaleDateString('en-CA')

export default function MiniProfileModal({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const [data, setData] = useState<MiniData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cheerState, setCheerState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const supabase = createClient()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const sixtyAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [
        { data: profile },
        { data: logs60 },
        { data: logs7 },
        { data: photoRows },
        { data: acts7 },
        { count: mealCount },
        { data: myLogs60 },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('food_logs').select('logged_at').eq('user_id', userId).gte('logged_at', sixtyAgo),
        supabase.from('food_logs').select('logged_at, meal_type, total_calories').eq('user_id', userId).gte('logged_at', weekAgo),
        supabase.from('food_logs').select('photo_url').eq('user_id', userId).not('photo_url', 'is', null)
          .order('logged_at', { ascending: false }).limit(6),
        // Readable once migration 021's group SELECT policy is applied; empty otherwise.
        supabase.from('activity_logs').select('logged_at, activity_name').eq('user_id', userId).gte('logged_at', weekAgo),
        supabase.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        user
          ? supabase.from('food_logs').select('logged_at').eq('user_id', user.id).gte('logged_at', sixtyAgo)
          : Promise.resolve({ data: [] as { logged_at: string }[] }),
      ])

      const goals: Goal[] = (profile?.goals as Goal[] | null) ?? (profile?.goal ? [profile.goal as Goal] : [])
      const today = localDay(new Date().toISOString())
      const weekRows = (logs7 ?? []) as { logged_at: string; meal_type: string; total_calories: number }[]
      const todayMeals = [...new Set(weekRows.filter(l => localDay(l.logged_at) === today).map(l => l.meal_type))]
      const actRows = (acts7 ?? []) as { logged_at: string; activity_name: string }[]
      const todayActivities = [...new Set(actRows.filter(a => localDay(a.logged_at) === today).map(a => a.activity_name))]

      const loggedDays = new Set(weekRows.map(l => localDay(l.logged_at)))
      const totalKcal = weekRows.reduce((s, l) => s + (l.total_calories || 0), 0)
      const avgKcal = loggedDays.size ? Math.round(totalKcal / loggedDays.size) : null

      const weightKg = (profile?.weight_kg as number) ?? null
      const targetKg = (profile?.target_weight_kg as number) ?? null
      const lbsToGo = weightKg && targetKg ? Math.round(Math.abs(kgToLbs(weightKg) - kgToLbs(targetKg))) : null

      const created = profile?.created_at ? new Date(profile.created_at as string) : null
      const memberSince = created
        ? created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null

      setData({
        goals,
        lbsToGo,
        streak: computeStreak((logs60 ?? []).map(l => l.logged_at as string)),
        myStreak: computeStreak(((myLogs60 ?? []) as { logged_at: string }[]).map(l => l.logged_at)),
        daysThisWeek: loggedDays.size,
        avatarUrl: (profile?.avatar_url as string) ?? null,
        memberSince,
        totalMeals: mealCount ?? 0,
        todayMeals,
        todayActivities,
        avgKcal,
        kcalTarget: (profile?.calorie_target as number) ?? null,
        activeDays: new Set(actRows.map(a => localDay(a.logged_at))).size,
        photos: ((photoRows ?? []) as { photo_url: string }[])
          .map(r => r.photo_url)
          .filter(u => !!u && !u.startsWith('blob:'))
          .slice(0, 3),
      })
      setLoading(false)
    })()
  }, [userId])

  async function sendCheer() {
    if (cheerState === 'sending' || cheerState === 'sent') return
    setCheerState('sending')
    try {
      const res = await fetch('/api/cheer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setCheerState(res.ok ? 'sent' : 'error')
    } catch {
      setCheerState('error')
    }
  }

  const sharedStreak = data && data.streak >= 2 && data.myStreak >= 2
    ? Math.min(data.streak, data.myStreak)
    : null

  const todayLine = data && (data.todayMeals.length > 0 || data.todayActivities.length > 0)
    ? [
        data.todayMeals.length ? `logged ${data.todayMeals.join(' + ')}` : null,
        data.todayActivities.length ? data.todayActivities.join(', ').toLowerCase() : null,
      ].filter(Boolean).join(' · ')
    : null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-stone-900 border border-stone-700 rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden">
            {data?.avatarUrl
              ? <img src={data.avatarUrl} alt="" className="w-full h-full object-cover" />
              : (name[0]?.toUpperCase() ?? '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{name}</p>
            <p className="text-stone-400 text-xs">
              {data?.memberSince ? `Member since ${data.memberSince} · ${data.totalMeals} meals logged` : 'Group member'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center w-9 h-9 -mr-1 -mt-1 text-stone-400 hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          /* Skeleton matching the loaded layout */
          <div className="mt-4 space-y-3" aria-label="Loading profile">
            <div className="h-6 w-2/3 bg-stone-800 rounded-full animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-20 bg-stone-800 rounded-xl animate-pulse" />
              <div className="h-20 bg-stone-800 rounded-xl animate-pulse" style={{ animationDelay: '80ms' }} />
            </div>
            <div className="h-10 bg-stone-800 rounded-xl animate-pulse" style={{ animationDelay: '160ms' }} />
            <div className="h-11 bg-stone-800 rounded-xl animate-pulse" style={{ animationDelay: '240ms' }} />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Today — live touch */}
            {todayLine && (
              <p className="text-emerald-300 text-xs bg-emerald-950/50 border border-emerald-800/40 rounded-xl px-3 py-2">
                Today: {todayLine}
              </p>
            )}

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

            {/* This week vs goals */}
            <div className="bg-stone-800/60 rounded-xl px-3 py-2.5 space-y-1.5">
              {data?.avgKcal != null && (
                <div className="flex items-center gap-2 text-xs">
                  <Utensils size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="text-stone-200">
                    ~{data.avgKcal.toLocaleString()} kcal/day
                    {data.kcalTarget ? <span className="text-stone-400"> · goal {data.kcalTarget.toLocaleString()}</span> : null}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <Dumbbell size={13} className="text-orange-400 shrink-0" aria-hidden="true" />
                <span className="text-stone-200">
                  {data?.activeDays ?? 0} active day{(data?.activeDays ?? 0) === 1 ? '' : 's'}
                  <span className="text-stone-400"> · goal {ACTIVE_DAYS_GOAL}</span>
                </span>
              </div>
              {/* Privacy: distance to goal only — no absolute weights */}
              {data?.lbsToGo != null && (
                <div className="flex items-center gap-2 text-xs">
                  <Target size={13} className="text-sky-400 shrink-0" aria-hidden="true" />
                  <span className="text-stone-200">
                    {data.lbsToGo === 0 ? 'At goal weight 🎉' : `${data.lbsToGo} lbs to goal weight`}
                  </span>
                </div>
              )}
            </div>

            {/* Shared streak flair */}
            {sharedStreak && (
              <p className="text-orange-300 text-xs text-center">
                🔥 You&apos;ve both logged {sharedStreak}+ days straight
              </p>
            )}

            {/* Recent meal photos */}
            {data && data.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {data.photos.map((url, i) => (
                  <img key={i} src={url} alt="" loading="lazy" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}

            {/* Cheer */}
            <button
              onClick={sendCheer}
              disabled={cheerState === 'sending' || cheerState === 'sent'}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                cheerState === 'sent'
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60'
              }`}
            >
              {cheerState === 'sent' ? '👏 Cheer sent!' : cheerState === 'sending' ? 'Sending…'
                : cheerState === 'error' ? 'Try again — 👏 Cheer them on' : `👏 Cheer ${name} on`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
