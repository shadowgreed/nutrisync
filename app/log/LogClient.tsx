'use client'

import { useState } from 'react'
import { Utensils, Flame, CheckCircle } from 'lucide-react'
import MealLogger from '@/components/MealLogger'
import { ACTIVITY_OPTIONS, estimateCaloriesBurned } from '@/lib/fitness'

export default function LogClient({ weightKg }: { weightKg: number }) {
  const [tab, setTab] = useState<'food' | 'activity'>('food')
  const [activityName, setActivityName] = useState('')
  const [duration, setDuration] = useState('')
  const [caloriesOverride, setCaloriesOverride] = useState('') // user-edited burn (overrides estimate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const estimatedCalories = activityName && duration
    ? estimateCaloriesBurned(activityName, Number(duration), weightKg)
    : null
  // What the field shows: the user's edit if they typed one, else the live estimate.
  const shownCalories = caloriesOverride !== '' ? caloriesOverride : (estimatedCalories != null ? String(estimatedCalories) : '')
  const finalCalories = Math.max(0, Math.round(Number(shownCalories) || 0))
  const isEdited = caloriesOverride !== '' && estimatedCalories != null && Number(caloriesOverride) !== estimatedCalories

  async function logActivity() {
    if (!activityName || !duration) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/log-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity_name: activityName,
        duration_minutes: Number(duration),
        calories_burned: finalCalories,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to save activity')
    } else {
      setSaved(true)
      setActivityName('')
      setDuration('')
      setCaloriesOverride('')
      setTimeout(() => setSaved(false), 3000)
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
          <Utensils size={16} />
          Food
        </button>
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-colors ${
            tab === 'activity' ? 'bg-orange-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
          }`}
        >
          <Flame size={16} />
          Activity
        </button>
      </div>

      {tab === 'food' && <MealLogger />}

      {tab === 'activity' && (
        <div className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs mb-2 block uppercase tracking-wider">Activity type</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_OPTIONS.map((name) => (
                <button
                  key={name}
                  onClick={() => setActivityName(name)}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    activityName === name
                      ? 'bg-orange-700 text-white'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs mb-2 block uppercase tracking-wider">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="30"
              min="1"
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {estimatedCalories !== null && (
            <div>
              <label className="text-stone-400 text-xs mb-2 block uppercase tracking-wider">Calories burned</label>
              <div className="bg-orange-950/40 border border-orange-800/40 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-orange-400 font-bold text-lg shrink-0">−</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={shownCalories}
                  onChange={e => setCaloriesOverride(e.target.value)}
                  aria-label="Calories burned"
                  className="flex-1 min-w-0 bg-transparent text-orange-400 font-bold text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-stone-400 text-sm shrink-0">kcal</span>
                {isEdited && (
                  <button
                    type="button"
                    onClick={() => setCaloriesOverride('')}
                    className="shrink-0 text-stone-400 hover:text-white text-xs underline underline-offset-2"
                  >
                    reset
                  </button>
                )}
              </div>
              <p className="text-stone-400 text-[11px] mt-1.5">
                {isEdited ? 'Using your number.' : 'Our estimate — edit it if your watch or treadmill says different.'}
              </p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={16} />
              Activity logged!
            </div>
          )}

          <button
            onClick={logActivity}
            disabled={saving || !activityName || !duration}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors"
          >
            {saving ? 'Saving…' : 'Log activity'}
          </button>
        </div>
      )}
    </div>
  )
}
