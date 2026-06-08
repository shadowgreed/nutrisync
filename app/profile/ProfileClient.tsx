'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Flame, Utensils, TrendingUp, Users, Copy, Check, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '../dashboard/DashboardClient'
import {
  calculateBMR, calculateTDEE, calculateBMI, bmiCategory,
  GOAL_LABELS, GOAL_EMOJIS, ACTIVITY_LABELS,
  formatWeight, formatHeight,
} from '@/lib/fitness'
import type { Profile } from '@/types'

interface LogRow { logged_at: string; total_calories: number }
interface ActivityRow { logged_at: string; calories_burned: number; activity_name: string; duration_minutes: number }

interface GroupRow { id: string; name: string; invite_code: string }

interface Props {
  profile: Profile
  email: string
  logs: LogRow[]
  activities: ActivityRow[]
  group: GroupRow | null
}

function groupByDay<T extends { logged_at: string }>(items: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  for (const item of items) {
    const day = item.logged_at.slice(0, 10)
    if (!map[day]) map[day] = []
    map[day].push(item)
  }
  return map
}

export default function ProfileClient({ profile, email, logs, activities, group }: Props) {
  const [tab, setTab] = useState<'stats' | 'history'>('stats')
  const [useMetric, setUseMetric] = useState(true)
  // Origin is only known on the client — set after mount so SSR and first client
  // render match (avoids a hydration mismatch on the invite link).
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const router = useRouter()
  useEffect(() => { setOrigin(window.location.origin) }, [])

  const inviteUrl = group ? `${origin}/group/join/${group.invite_code}` : ''
  function copyInvite() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  async function leaveGroup() {
    if (!group) return
    setLeaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLeaving(false); return }
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user.id)
    setLeaving(false)
    if (!error) { setConfirmLeave(false); router.refresh() }
  }

  // Calculated values
  const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null
  const bmr = (profile.weight_kg && profile.height_cm && age && profile.biological_sex)
    ? calculateBMR(profile.weight_kg, profile.height_cm, age, profile.biological_sex as 'male' | 'female' | 'prefer_not_to_say')
    : null
  const tdee = (bmr && profile.activity_level)
    ? calculateTDEE(bmr, profile.activity_level as any)
    : null
  const bmi = (profile.weight_kg && profile.height_cm)
    ? calculateBMI(profile.weight_kg, profile.height_cm)
    : null

  // Calorie totals (last 7 days) — averaged over LOGGED days so the number matches
  // the Trends page (averaging over 7 calendar days made a single 92-kcal day read as 13).
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const recentLogs = logs.filter(l => l.logged_at.slice(0, 10) >= sevenDaysAgo)
  const recentActivities = activities.filter(a => a.logged_at.slice(0, 10) >= sevenDaysAgo)
  const loggedDayCount = new Set(recentLogs.map(l => l.logged_at.slice(0, 10))).size
  const divisor = Math.max(1, loggedDayCount)
  const totalCaloriesIn = recentLogs.reduce((s, l) => s + (l.total_calories || 0), 0)
  const totalCaloriesBurned = recentActivities.reduce((s, a) => s + (a.calories_burned || 0), 0)
  const avgDailyCaloriesIn = Math.round(totalCaloriesIn / divisor)
  const avgDailyBurned = Math.round(totalCaloriesBurned / divisor)
  const avgNet = avgDailyCaloriesIn - avgDailyBurned

  // Build last 7 days bar chart data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })

  const logsByDay = groupByDay(logs)
  const activitiesByDay = groupByDay(activities)

  const chartData = days.map(day => ({
    day: day.slice(5), // MM-DD
    caloriesIn: logsByDay[day]?.reduce((s, l) => s + (l.total_calories || 0), 0) ?? 0,
    burned: activitiesByDay[day]?.reduce((s, a) => s + (a.calories_burned || 0), 0) ?? 0,
  }))

  const maxCalories = Math.max(...chartData.map(d => Math.max(d.caloriesIn, d.burned)), 500)

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-2xl font-bold text-white">
            {profile.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{profile.display_name}</h1>
            <p className="text-stone-400 text-sm">{email}</p>
            {profile.goal && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/50">
                {GOAL_EMOJIS[profile.goal]} {GOAL_LABELS[profile.goal]}
              </span>
            )}
          </div>
        </div>
        <Link href="/profile/edit" className="text-stone-400 hover:text-white transition-colors">
          <Settings size={20} />
        </Link>
      </div>

      {/* Calorie balance cards — averaged over logged days */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
          <Utensils size={16} className="text-emerald-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-white font-bold text-lg tabular-nums">{avgDailyCaloriesIn}</p>
          <p className="text-stone-400 text-xs">avg kcal/day</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
          <Flame size={16} className="text-orange-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-white font-bold text-lg tabular-nums">{avgDailyBurned}</p>
          <p className="text-stone-400 text-xs">burned/day</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
          <TrendingUp size={16} className="text-sky-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-white font-bold text-lg tabular-nums">{avgNet > 0 ? '+' : ''}{avgNet}</p>
          <p className="text-stone-400 text-xs">net/day</p>
        </div>
      </div>

      {/* 7-day calorie chart */}
      <div className="mx-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 mb-6">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-4">7-day calorie balance</p>
        <div className="flex items-end gap-1.5 h-24">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '80px' }}>
                {d.caloriesIn > 0 && (
                  <div
                    className="w-full bg-emerald-600 rounded-sm"
                    style={{ height: `${(d.caloriesIn / maxCalories) * 100}%` }}
                    title={`${d.caloriesIn} kcal in`}
                  />
                )}
              </div>
              <span className="text-stone-400 text-[11px]">{d.day}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            <span className="text-stone-400 text-xs">Food in</span>
          </div>
          {profile.calorie_target && (
            <div className="ml-auto text-stone-400 text-xs">
              Target: <span className="text-white">{profile.calorie_target} kcal</span>
            </div>
          )}
        </div>
      </div>

      {/* Group section */}
      <div className="px-4 mb-4">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Group</p>
        {group ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center">
                <Users size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold">{group.name}</p>
                <Link href="/feed" className="text-emerald-400 text-xs hover:underline">View group feed →</Link>
              </div>
            </div>
            <div>
              <p className="text-stone-400 text-xs mb-1.5">Invite friends with this code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-stone-800 rounded-xl px-3 py-2.5 text-emerald-300 text-base font-mono font-semibold tracking-wider text-center">
                  {group.invite_code}
                </code>
                <button
                  onClick={copyInvite}
                  disabled={!inviteUrl}
                  aria-label="Copy invite link"
                  className="shrink-0 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors"
                >
                  {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            {/* Leave group */}
            <div className="pt-1 border-t border-stone-800">
              {confirmLeave ? (
                <div className="flex items-center gap-2 pt-3">
                  <p className="flex-1 text-stone-300 text-xs">Leave “{group.name}”? You can rejoin with the code.</p>
                  <button
                    onClick={leaveGroup}
                    disabled={leaving}
                    className="shrink-0 bg-red-900/60 hover:bg-red-900 text-red-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {leaving ? 'Leaving…' : 'Leave'}
                  </button>
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="shrink-0 text-stone-300 hover:text-white text-xs px-2 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeave(true)}
                  className="flex items-center gap-1.5 text-stone-400 hover:text-red-300 text-xs font-medium pt-3 transition-colors"
                >
                  <LogOut size={13} aria-hidden="true" /> Leave group
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <p className="text-stone-400 text-sm mb-3">You're not in a group yet. Create one or join with an invite code.</p>
            <div className="flex gap-2">
              <Link
                href="/group/create"
                className="flex-1 text-center bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Create group
              </Link>
              <Link
                href="/group/join"
                className="flex-1 text-center bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Join with code
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-4">
        {(['stats', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {tab === 'stats' && (
        <div className="px-4 space-y-3">
          {/* Unit toggle */}
          <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 mb-1">
            <button
              onClick={() => setUseMetric(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                useMetric ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              Metric
            </button>
            <button
              onClick={() => setUseMetric(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !useMetric ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-stone-300'
              }`}
            >
              Imperial
            </button>
          </div>

          {bmi && (
            <StatRow label="BMI" value={`${bmi} — ${bmiCategory(bmi)}`} />
          )}
          {profile.weight_kg && (
            <StatRow label="Weight" value={formatWeight(profile.weight_kg, useMetric)} />
          )}
          {profile.height_cm && (
            <StatRow label="Height" value={formatHeight(profile.height_cm, useMetric)} />
          )}
          {tdee && <StatRow label="Est. daily burn (TDEE)" value={`${tdee} kcal`} />}
          {profile.calorie_target && <StatRow label="Calorie target" value={`${profile.calorie_target} kcal`} />}
          {profile.activity_level && (
            <StatRow label="Activity level" value={profile.activity_level.replace('_', ' ')} />
          )}
          <Link
            href="/onboarding"
            className="block text-center text-stone-400 text-sm mt-4 hover:text-emerald-400 transition-colors"
          >
            Edit profile →
          </Link>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="px-4 space-y-2">
          {activities.slice(0, 20).map(a => (
            <div key={a.logged_at + a.activity_name} className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{a.activity_name}</p>
                <p className="text-stone-400 text-xs">{a.duration_minutes} min · {new Date(a.logged_at).toLocaleDateString()}</p>
              </div>
              <span className="text-orange-400 font-bold text-sm">-{a.calories_burned} kcal</span>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-center text-stone-400 py-8">No activity logged yet</p>
          )}
        </div>
      )}

      <BottomNav active="profile" />
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
      <span className="text-stone-400 text-sm">{label}</span>
      <span className="text-white text-sm font-medium capitalize">{value}</span>
    </div>
  )
}
