'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Settings, Users, ChevronRight } from 'lucide-react'
import AvatarUpload from '@/components/AvatarUpload'
import { BottomNav } from '../dashboard/DashboardClient'
import LogFab from '@/components/LogFab'
import { mlToOz } from '@/lib/water'
import {
  calculateBMR, calculateTDEE, calculateBMI, bmiCategory,
  GOAL_LABELS, GOAL_EMOJIS,
  formatWeight, formatHeight, kmToMiles,
} from '@/lib/fitness'
import type { Profile } from '@/types'

interface ActivityRow { logged_at: string; calories_burned: number; activity_name: string; duration_minutes: number | null; distance_km?: number | null; steps?: number | null }
interface FoodRow { logged_at: string; total_calories: number | null; macro_totals: { protein_g?: number } | null }
interface WaterRow { logged_at: string; amount_ml: number }

interface GroupSummary { id: string; name: string; photo_url: string | null; memberCount: number; coachName: string | null }

interface Props {
  profile: Profile
  email: string
  activities: ActivityRow[]
  group: GroupSummary | null
  foodLogs: FoodRow[]
  waterLogs: WaterRow[]
  calorieTarget: number | null
  proteinTarget: number
  waterTargetMl: number
  streak: number
  reactionsReceived: number
  commentsReceived: number
}

const TAB_KEY = 'ns_profile_tab'
// Local-day key in the viewer's timezone (server is UTC). Mirrors the dashboard.
const localDayKey = (ts: string | number | Date) => new Date(ts).toLocaleDateString('en-CA')

// Human label for an activity's "amount": distance / steps for distance activities,
// otherwise duration.
function activityMetric(a: ActivityRow): string {
  if (a.distance_km != null) return `${kmToMiles(a.distance_km).toFixed(2)} mi`
  if (a.steps != null) return `${a.steps.toLocaleString()} steps`
  if (a.duration_minutes != null) return `${a.duration_minutes} min`
  return ''
}

export default function ProfileClient({
  profile, email, activities, group, foodLogs, waterLogs, calorieTarget, proteinTarget, waterTargetMl,
  streak, reactionsReceived, commentsReceived,
}: Props) {
  const [tab, setTab] = useState<'stats' | 'history'>('stats')
  const [useMetric, setUseMetric] = useState(true)

  // Persist the Stats/History selection across visits (FR-008).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY)
      if (saved === 'history' || saved === 'stats') setTab(saved)
    } catch { /* ignore */ }
  }, [])
  function selectTab(t: 'stats' | 'history') {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ }
  }

  // ── Today's progress (Goal & Progress card) ────────────────────────────────
  const todayKey = localDayKey(Date.now())
  const todayFoods = foodLogs.filter(f => localDayKey(f.logged_at) === todayKey)
  const todayWater = waterLogs.filter(w => localDayKey(w.logged_at) === todayKey)
  const caloriesIn = Math.round(todayFoods.reduce((s, f) => s + (f.total_calories || 0), 0))
  const proteinIn = Math.round(todayFoods.reduce((s, f) => s + (f.macro_totals?.protein_g || 0), 0))
  const waterMl = todayWater.reduce((s, w) => s + (w.amount_ml || 0), 0)
  const calTarget = calorieTarget ?? 2000

  // Calculated body metrics
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

  const metrics: { label: string; value: string }[] = []
  if (bmi) metrics.push({ label: 'BMI', value: `${bmi} · ${bmiCategory(bmi)}` })
  if (profile.weight_kg) metrics.push({ label: 'Weight', value: formatWeight(profile.weight_kg, useMetric) })
  if (profile.height_cm) metrics.push({ label: 'Height', value: formatHeight(profile.height_cm, useMetric) })
  if (tdee) metrics.push({ label: 'Daily burn (TDEE)', value: `${tdee} kcal` })
  if (profile.calorie_target) metrics.push({ label: 'Goal calories', value: `${profile.calorie_target} kcal` })
  if (profile.activity_level) metrics.push({ label: 'Activity level', value: profile.activity_level.replace('_', ' ') })

  return (
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-4 pt-safe pb-5 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <AvatarUpload initialUrl={profile.avatar_url} name={profile.display_name} size="md" />
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
        <Link href="/settings" aria-label="Settings" className="text-stone-400 hover:text-white transition-colors">
          <Settings size={20} />
        </Link>
      </div>

      {/* Goal & Progress — today at a glance (FR-003) */}
      <div className="px-4 mb-4">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Today</p>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2">
            <RingStat
              label="Calories" color="rgb(16 185 129)"
              current={caloriesIn} target={calTarget}
              valueText={`${caloriesIn.toLocaleString()} / ${calTarget.toLocaleString()}`}
            />
            <RingStat
              label="Protein" color="rgb(244 63 94)"
              current={proteinIn} target={proteinTarget}
              valueText={`${proteinIn}g / ${proteinTarget}g`}
            />
            <RingStat
              label="Water" color="rgb(56 189 248)"
              current={waterMl} target={waterTargetMl}
              valueText={`${mlToOz(waterMl)} / ${mlToOz(waterTargetMl)} oz`}
            />
          </div>
        </div>
      </div>

      {/* Community activity — reinforce accountability */}
      <div className="px-4 mb-4">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Community</p>
        <div className="grid grid-cols-3 gap-2">
          <CommunityStat emoji="🔥" value={streak} label={`day streak`} />
          <CommunityStat emoji="👍" value={reactionsReceived} label="reactions" />
          <CommunityStat emoji="💬" value={commentsReceived} label="comments" />
        </div>
      </div>

      {/* Group summary — read-only; management lives at /group/manage */}
      <div className="px-4 mb-4">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Group</p>
        {group ? (
          <Link
            href="/group/manage"
            className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-4 hover:border-stone-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center overflow-hidden shrink-0">
              {group.photo_url
                ? <img src={group.photo_url} alt={group.name} className="w-full h-full object-cover" />
                : <Users size={20} className="text-emerald-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{group.name}</p>
              <p className="text-stone-400 text-xs truncate">
                {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                {group.coachName ? ` · Coach ${group.coachName}` : ''}
              </p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs font-semibold">
              View group <ChevronRight size={14} />
            </span>
          </Link>
        ) : (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <p className="text-stone-400 text-sm mb-3">You&apos;re not in a group yet. Create one or join with an invite code.</p>
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
            onClick={() => selectTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stats tab — health metrics grid (FR-004) */}
      {tab === 'stats' && (
        <div className="px-4">
          {/* Unit toggle */}
          <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 mb-3">
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

          {metrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {metrics.map(m => (
                <div key={m.label} className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3">
                  <p className="text-stone-400 text-[11px] uppercase tracking-wider">{m.label}</p>
                  <p className="text-white text-base font-semibold capitalize mt-1">{m.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-stone-400 py-8 text-sm">Add your stats in profile settings to see metrics here.</p>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="px-4 space-y-2">
          {activities.slice(0, 20).map(a => (
            <div key={a.logged_at + a.activity_name} className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{a.activity_name}</p>
                <p className="text-stone-400 text-xs">{activityMetric(a)} · {new Date(a.logged_at).toLocaleDateString()}</p>
              </div>
              <span className="text-orange-400 font-bold text-sm">-{a.calories_burned} kcal</span>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-center text-stone-400 py-8">No activity logged yet</p>
          )}
        </div>
      )}

      <LogFab />
      <BottomNav active="profile" />
    </div>
  )
}

// A community metric tile: big emoji + count + label.
function CommunityStat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
      <p className="text-xl leading-none mb-1" aria-hidden="true">{emoji}</p>
      <p className="text-white text-xl font-extrabold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-stone-400 text-[11px]">{label}</p>
    </div>
  )
}

// A small circular progress ring with the percent centered, a metric label and
// the "current / target" text below.
function RingStat({ label, color, current, target, valueText }: {
  label: string; color: string; current: number; target: number; valueText: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const size = 72, stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(41 37 36)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold tabular-nums">{pct}%</span>
      </div>
      <p className="text-stone-300 text-xs font-medium mt-1.5">{label}</p>
      <p className="text-stone-500 text-[11px] tabular-nums">{valueText}</p>
    </div>
  )
}
