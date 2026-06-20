'use client'

import { useState } from 'react'
import { Utensils, Flame, CheckCircle, Repeat, Activity as ActivityIcon, ChevronDown, Pencil } from 'lucide-react'
import MealLogger from '@/components/MealLogger'
import {
  ACTIVITY_OPTIONS, estimateCaloriesBurned,
  isDistanceActivity, activityUsesSteps,
  milesToKm, stepsToKm, kmToMiles,
} from '@/lib/fitness'

// Daily activity goal (minutes). No per-user setting yet — a sensible default.
const DAILY_GOAL_MIN = 30

// The few activities shown as chips up front; the rest hide behind "More".
const PRIMARY_CHIPS = ['Walking', 'Running', 'Cycling', 'Swimming', 'Weight training', 'HIIT', 'Yoga', 'Hiking']

const EMOJI: Record<string, string> = {
  'Walking': '🚶', 'Running': '🏃', 'Cycling': '🚴', 'Swimming': '🏊',
  'Weight training': '🏋️', 'HIIT': '🔥', 'Yoga': '🧘', 'Hiking': '🥾',
  'Jump rope': '🪢', 'Rowing': '🚣', 'Dancing': '💃', 'Pilates': '🤸', 'Other': '⚡',
}
const emoji = (name: string) => EMOJI[name] ?? '⚡'

// Intensity scales the MET-based estimate (effort the user actually put in).
type Intensity = 'easy' | 'moderate' | 'hard'
const INTENSITY: { key: Intensity; label: string; mult: number }[] = [
  { key: 'easy', label: 'Easy', mult: 0.8 },
  { key: 'moderate', label: 'Moderate', mult: 1.0 },
  { key: 'hard', label: 'Hard', mult: 1.2 },
]

interface RecentActivity { activity_name: string; duration_minutes: number | null; distance_km: number | null; steps: number | null; logged_at: string }

const localDayKey = (ts: string | number | Date) => new Date(ts).toLocaleDateString('en-CA')

export default function LogClient({
  weightKg, initialTab = 'food', recentActivities = [],
}: {
  weightKg: number; initialTab?: 'food' | 'activity'; recentActivities?: RecentActivity[]
}) {
  const [tab, setTab] = useState<'food' | 'activity'>(initialTab)

  // ── Activity state ──────────────────────────────────────────────────────────
  const [activityName, setActivityName] = useState('')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [distanceMi, setDistanceMi] = useState('')
  const [steps, setSteps] = useState('')
  const [caloriesInput, setCaloriesInput] = useState<string | null>(null) // null = use estimate
  const [editingCals, setEditingCals] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ name: string; minutes: number; pct: number } | null>(null)

  // Today's completed minutes (from recent logs, filtered to the local day) +
  // anything logged this session.
  const todayKey = localDayKey(Date.now())
  const loggedTodayBase = recentActivities
    .filter(a => localDayKey(a.logged_at) === todayKey)
    .reduce((s, a) => s + (a.duration_minutes ?? 0), 0)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const todayMinutes = loggedTodayBase + sessionMinutes
  const goalPct = Math.min(100, Math.round((todayMinutes / DAILY_GOAL_MIN) * 100))

  // Recent activities: newest-first, de-duped by type, capped at 4.
  const recentUnique: RecentActivity[] = []
  for (const a of recentActivities) {
    if (!recentUnique.some(r => r.activity_name === a.activity_name)) recentUnique.push(a)
    if (recentUnique.length >= 4) break
  }

  const showSteps = activityUsesSteps(activityName)
  const showDistance = isDistanceActivity(activityName)
  const mult = INTENSITY.find(i => i.key === intensity)!.mult
  const durNum = Number(duration) || 0

  const estimate = activityName && durNum > 0
    ? Math.max(0, Math.round(estimateCaloriesBurned(activityName, durNum, weightKg) * mult))
    : null
  const shownCalories = caloriesInput ?? (estimate != null ? String(estimate) : '')
  const finalCalories = Math.max(0, Math.round(Number(shownCalories) || 0))
  const canSave = !!activityName && durNum > 0

  function resetActivity() {
    setActivityName(''); setDuration(''); setIntensity('moderate')
    setDistanceMi(''); setSteps(''); setCaloriesInput(null); setEditingCals(false)
  }

  function selectActivity(name: string) {
    setActivityName(name); setCaloriesInput(null); setEditingCals(false)
  }

  function logAgain(a: RecentActivity) {
    setActivityName(a.activity_name)
    setDuration(a.duration_minutes ? String(a.duration_minutes) : '')
    setDistanceMi(a.distance_km ? String(kmToMiles(a.distance_km).toFixed(2)) : '')
    setSteps(a.steps ? String(a.steps) : '')
    setIntensity('moderate'); setCaloriesInput(null); setEditingCals(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  // Dynamic CTA label.
  const cta = !activityName
    ? 'Select an activity'
    : durNum > 0
      ? `Log ${durNum}-min ${activityName}`
      : `Log ${activityName}`

  async function logActivity() {
    if (!canSave) return
    setSaving(true); setError('')

    const payload: Record<string, unknown> = {
      activity_name: activityName,
      duration_minutes: durNum,
      calories_burned: finalCalories,
    }
    const km = distanceMi !== '' ? milesToKm(Number(distanceMi) || 0)
      : (showSteps && steps !== '' ? stepsToKm(Number(steps) || 0) : 0)
    if (showDistance && km > 0) payload.distance_km = Math.round(km * 100) / 100
    if (showSteps && steps !== '') payload.steps = Math.round(Number(steps) || 0)

    const res = await fetch('/api/log-activity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save activity')
    } else {
      const newMinutes = todayMinutes + durNum
      setSuccess({ name: activityName, minutes: durNum, pct: Math.min(100, Math.round((newMinutes / DAILY_GOAL_MIN) * 100)) })
      setSessionMinutes(s => s + durNum)
      resetActivity()
      setTimeout(() => setSuccess(null), 2000)
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('food')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            tab === 'food' ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          <Utensils size={16} /> Food
        </button>
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            tab === 'activity' ? 'bg-orange-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          <Flame size={16} /> Activity
        </button>
      </div>

      {tab === 'food' && <MealLogger />}

      {tab === 'activity' && (
        <div className="space-y-5">
          {/* ── Today's activity summary ── */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-stone-300 text-sm font-semibold">Today&apos;s activity</p>
              <span className="text-orange-400 text-sm font-bold tabular-nums">{goalPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-stone-800 overflow-hidden" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} aria-label="Daily activity goal progress">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="text-stone-400 text-xs mt-2">
              {todayMinutes} of {DAILY_GOAL_MIN} min · {todayMinutes >= DAILY_GOAL_MIN ? 'goal reached 🎉' : `${DAILY_GOAL_MIN - todayMinutes} min to goal`}
            </p>
          </div>

          {/* ── Recent activities ── */}
          {recentUnique.length > 0 && (
            <div>
              <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider">Recent</p>
              <div className="space-y-2">
                {recentUnique.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-2xl px-3 py-2.5">
                    <span className="text-xl shrink-0" aria-hidden="true">{emoji(a.activity_name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{a.activity_name}</p>
                      {a.duration_minutes ? <p className="text-stone-500 text-xs">{a.duration_minutes} min</p> : null}
                    </div>
                    <button
                      onClick={() => logAgain(a)}
                      className="shrink-0 flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                    >
                      <Repeat size={13} /> Log again
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Apple Health (future entry point) ── */}
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 opacity-60 cursor-default"
          >
            <ActivityIcon size={16} className="text-stone-400 shrink-0" />
            <span className="flex-1 text-left text-sm text-stone-200">Connect Apple Health</span>
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-800 border border-stone-700 px-1.5 py-0.5 rounded-full">Soon</span>
          </button>

          {/* ── Activity selection (compact chips) ── */}
          <div>
            <p className="text-stone-400 text-xs mb-2 uppercase tracking-wider">Activity</p>
            <div className="flex flex-wrap gap-2">
              {(showMore ? ACTIVITY_OPTIONS : PRIMARY_CHIPS).map(name => (
                <button
                  key={name}
                  onClick={() => selectActivity(name)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium min-h-[44px] transition-colors ${
                    activityName === name ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  <span aria-hidden="true">{emoji(name)}</span> {name}
                </button>
              ))}
              {!showMore && (
                <button
                  onClick={() => setShowMore(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium min-h-[44px] bg-stone-800 text-stone-300 hover:bg-stone-700 transition-colors"
                >
                  More <ChevronDown size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ── Selected activity details ── */}
          {activityName && (
            <div className="space-y-4 bg-stone-900/60 border border-stone-800 rounded-2xl p-4">
              <p className="text-white font-semibold flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{emoji(activityName)}</span> {activityName}
              </p>

              {/* Duration — required */}
              <div>
                <label htmlFor="act-duration" className="text-stone-400 text-xs mb-1.5 block uppercase tracking-wider">Duration (minutes)</label>
                <input
                  id="act-duration"
                  type="number" inputMode="numeric" min="1"
                  value={duration}
                  onChange={e => { setDuration(e.target.value); setCaloriesInput(null) }}
                  placeholder="30"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Intensity — required, default Moderate */}
              <div>
                <p className="text-stone-400 text-xs mb-1.5 uppercase tracking-wider">Intensity</p>
                <div className="flex bg-stone-950 border border-stone-700 rounded-xl p-1 gap-1">
                  {INTENSITY.map(o => (
                    <button
                      key={o.key}
                      onClick={() => { setIntensity(o.key); setCaloriesInput(null) }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        intensity === o.key ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional steps / distance per activity */}
              {showSteps && (
                <div>
                  <label htmlFor="act-steps" className="text-stone-400 text-xs mb-1.5 block uppercase tracking-wider">Steps <span className="text-stone-600 normal-case">· optional</span></label>
                  <input
                    id="act-steps" type="number" inputMode="numeric" min="1"
                    value={steps} onChange={e => setSteps(e.target.value)} placeholder="e.g. 6000"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
              {showDistance && (
                <div>
                  <label htmlFor="act-distance" className="text-stone-400 text-xs mb-1.5 block uppercase tracking-wider">Distance (miles) <span className="text-stone-600 normal-case">· optional</span></label>
                  <input
                    id="act-distance" type="number" inputMode="decimal" min="0" step="0.1"
                    value={distanceMi} onChange={e => setDistanceMi(e.target.value)} placeholder="e.g. 3.0"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {showSteps && steps !== '' && distanceMi === '' && (
                    <p className="text-stone-500 text-[11px] mt-1.5">≈ {kmToMiles(stepsToKm(Number(steps) || 0)).toFixed(2)} mi from steps</p>
                  )}
                </div>
              )}

              {/* Estimated burn — calculated; edit is secondary */}
              {estimate != null && (
                <div className="bg-orange-950/40 border border-orange-800/40 rounded-xl px-4 py-3">
                  <p className="text-stone-400 text-[11px] uppercase tracking-wider mb-0.5">Estimated burn</p>
                  {editingCals ? (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 font-bold text-lg shrink-0">−</span>
                      <input
                        type="number" inputMode="numeric" min={0} autoFocus
                        value={shownCalories}
                        onChange={e => setCaloriesInput(e.target.value)}
                        aria-label="Calories burned"
                        className="flex-1 min-w-0 bg-transparent text-orange-400 font-bold text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-stone-400 text-sm shrink-0">kcal</span>
                      <button type="button" onClick={() => { setCaloriesInput(null); setEditingCals(false) }} className="shrink-0 text-stone-400 hover:text-white text-xs underline underline-offset-2">reset</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-orange-400 font-bold text-lg">−{finalCalories} <span className="text-stone-400 text-sm font-normal">kcal</span></p>
                      <button type="button" onClick={() => setEditingCals(true)} className="flex items-center gap-1 text-stone-400 hover:text-white text-xs">
                        <Pencil size={12} /> Edit estimate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Success card */}
          {success && (
            <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-2xl p-4 text-center">
              <p className="text-2xl mb-1">🔥</p>
              <p className="text-white font-bold">Great work</p>
              <p className="text-emerald-200 text-sm mt-0.5">{success.name} logged · {success.minutes} min added</p>
              <p className="text-stone-400 text-xs mt-1">Today&apos;s goal: {success.pct}% complete</p>
            </div>
          )}

          {/* Dynamic CTA */}
          <button
            onClick={logActivity}
            disabled={saving || !canSave}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? 'Saving…' : !canSave && !!activityName ? cta : !activityName ? cta : <><CheckCircle size={16} /> {cta}</>}
          </button>
        </div>
      )}
    </div>
  )
}
