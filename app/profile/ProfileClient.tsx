'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Settings, Users, ChevronRight } from 'lucide-react'
import AvatarUpload from '@/components/AvatarUpload'
import { BottomNav } from '../dashboard/DashboardClient'
import {
  calculateBMR, calculateTDEE, calculateBMI, bmiCategory,
  GOAL_LABELS, GOAL_EMOJIS,
  formatWeight, formatHeight, kmToMiles,
} from '@/lib/fitness'
import type { Profile } from '@/types'

interface ActivityRow { logged_at: string; calories_burned: number; activity_name: string; duration_minutes: number | null; distance_km?: number | null; steps?: number | null }

interface GroupSummary { id: string; name: string; photo_url: string | null; memberCount: number; coachName: string | null }

interface Props {
  profile: Profile
  email: string
  activities: ActivityRow[]
  group: GroupSummary | null
}

// Human label for an activity's "amount": distance / steps for distance activities,
// otherwise duration.
function activityMetric(a: ActivityRow): string {
  if (a.distance_km != null) return `${kmToMiles(a.distance_km).toFixed(2)} mi`
  if (a.steps != null) return `${a.steps.toLocaleString()} steps`
  if (a.duration_minutes != null) return `${a.duration_minutes} min`
  return ''
}

export default function ProfileClient({ profile, email, activities, group }: Props) {
  const [tab, setTab] = useState<'stats' | 'history'>('stats')
  const [useMetric, setUseMetric] = useState(true)

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

  return (
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 flex items-start justify-between">
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
        <Link href="/profile/edit" aria-label="Edit profile & settings" className="text-stone-400 hover:text-white transition-colors">
          <Settings size={20} />
        </Link>
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
                ? <img src={group.photo_url} alt="" className="w-full h-full object-cover" />
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
