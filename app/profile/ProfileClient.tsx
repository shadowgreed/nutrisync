'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Flame, Utensils, TrendingUp, Users, Copy, Check, LogOut, Camera, Loader2, UserPlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvatarUpload from '@/components/AvatarUpload'
import { BottomNav } from '../dashboard/DashboardClient'
import {
  calculateBMR, calculateTDEE, calculateBMI, bmiCategory,
  GOAL_LABELS, GOAL_EMOJIS, ACTIVITY_LABELS,
  formatWeight, formatHeight, kmToMiles,
} from '@/lib/fitness'
import type { Profile } from '@/types'

interface LogRow { logged_at: string; total_calories: number }
interface ActivityRow { logged_at: string; calories_burned: number; activity_name: string; duration_minutes: number | null; distance_km?: number | null; steps?: number | null }

interface GroupRow { id: string; name: string; invite_code: string; created_by: string | null; photo_url: string | null }
interface PendingRequest { id: string; user_id: string; display_name: string; avatar_url: string | null }

interface Props {
  profile: Profile
  email: string
  logs: LogRow[]
  activities: ActivityRow[]
  group: GroupRow | null
  isOwner: boolean
  pendingRequests: PendingRequest[]
}

// Human label for an activity's "amount": distance / steps for distance activities,
// otherwise duration.
function activityMetric(a: ActivityRow): string {
  if (a.distance_km != null) return `${kmToMiles(a.distance_km).toFixed(2)} mi`
  if (a.steps != null) return `${a.steps.toLocaleString()} steps`
  if (a.duration_minutes != null) return `${a.duration_minutes} min`
  return ''
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

export default function ProfileClient({ profile, email, logs, activities, group, isOwner, pendingRequests }: Props) {
  const [tab, setTab] = useState<'stats' | 'history'>('stats')
  const [useMetric, setUseMetric] = useState(true)
  // Origin is only known on the client — set after mount so SSR and first client
  // render match (avoids a hydration mismatch on the invite link).
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<'code' | 'invite' | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [requests, setRequests] = useState<PendingRequest[]>(pendingRequests)
  const [resolving, setResolving] = useState<string | null>(null)
  const [groupPhoto, setGroupPhoto] = useState<string | null>(group?.photo_url ?? null)
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false)
  const groupPhotoRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  useEffect(() => { setOrigin(window.location.origin) }, [])

  // The creator's private direct-join link (founder only).
  const inviteUrl = group ? `${origin}/group/join/${group.invite_code}` : ''
  // The shareable "request to join" link any member can send to friends.
  const requestUrl = group ? `${origin}/group/request/${group.id}` : ''

  function copy(which: 'code' | 'invite', text: string) {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  async function resolveRequest(id: string, approve: boolean) {
    setResolving(id)
    try {
      const res = await fetch('/api/group/resolve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, approve }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
        router.refresh()
      }
    } finally {
      setResolving(null)
    }
  }

  async function handleGroupPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !group) return
    setUploadingGroupPhoto(true)
    const supabase = createClient()
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${group.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('group-photos')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
      if (!upErr) {
        const publicUrl = supabase.storage.from('group-photos').getPublicUrl(path).data.publicUrl
        await supabase.from('groups').update({ photo_url: publicUrl }).eq('id', group.id)
        setGroupPhoto(publicUrl)
        router.refresh()
      }
    } finally {
      setUploadingGroupPhoto(false)
      if (groupPhotoRef.current) groupPhotoRef.current.value = ''
    }
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
            {/* Group header — founder can set the cover photo */}
            <div className="flex items-center gap-3">
              <input ref={groupPhotoRef} type="file" accept="image/*" onChange={handleGroupPhoto} className="hidden" />
              {isOwner ? (
                <button
                  onClick={() => groupPhotoRef.current?.click()}
                  disabled={uploadingGroupPhoto}
                  aria-label="Change group photo"
                  className="relative w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center overflow-hidden shrink-0"
                >
                  {groupPhoto
                    ? <img src={groupPhoto} alt="" className="w-full h-full object-cover" />
                    : <Users size={20} className="text-emerald-400" />}
                  <span className="absolute -bottom-1 -right-1 bg-stone-800 border border-stone-600 rounded-full p-1 text-stone-100">
                    {uploadingGroupPhoto ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                  </span>
                </button>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center overflow-hidden shrink-0">
                  {groupPhoto
                    ? <img src={groupPhoto} alt="" className="w-full h-full object-cover" />
                    : <Users size={20} className="text-emerald-400" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{group.name}</p>
                <Link href="/feed" className="text-emerald-400 text-xs hover:underline">View group feed →</Link>
              </div>
            </div>

            {/* Pending join requests — founder only */}
            {isOwner && requests.length > 0 && (
              <div className="bg-stone-800/60 rounded-xl p-3 space-y-2">
                <p className="text-stone-300 text-xs font-semibold">{requests.length} request{requests.length > 1 ? 's' : ''} to join</p>
                {requests.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : r.display_name[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 min-w-0 text-stone-200 text-sm truncate">{r.display_name}</span>
                    <button
                      onClick={() => resolveRequest(r.id, true)}
                      disabled={resolving === r.id}
                      className="shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resolving === r.id ? '…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => resolveRequest(r.id, false)}
                      disabled={resolving === r.id}
                      aria-label={`Deny ${r.display_name}`}
                      className="shrink-0 text-stone-400 hover:text-red-300 p-1.5 transition-colors disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Invite code — founder only (private direct-join link) */}
            {isOwner && (
              <div>
                <p className="text-stone-400 text-xs mb-1.5">Your private invite code (instant join)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-stone-800 rounded-xl px-3 py-2.5 text-emerald-300 text-base font-mono font-semibold tracking-wider text-center">
                    {group.invite_code}
                  </code>
                  <button
                    onClick={() => copy('code', inviteUrl)}
                    disabled={!inviteUrl}
                    aria-label="Copy invite link"
                    className="shrink-0 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors"
                  >
                    {copied === 'code' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                    {copied === 'code' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Invite a friend — anyone; creates a request the founder approves */}
            <div>
              <p className="text-stone-400 text-xs mb-1.5">
                {isOwner ? 'Or share an approval link' : 'Invite a friend (the founder approves new members)'}
              </p>
              <button
                onClick={() => copy('invite', requestUrl)}
                disabled={!requestUrl}
                className="w-full flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-100 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {copied === 'invite' ? <Check size={15} aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}
                {copied === 'invite' ? 'Invite link copied!' : 'Copy invite link'}
              </button>
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
