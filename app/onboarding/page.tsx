'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  GOAL_LABELS, GOAL_EMOJIS, ACTIVITY_LABELS,
  calculateBMR, calculateTDEE, calculateCalorieTarget,
  lbsToKg, ftInToCm,
} from '@/lib/fitness'
import { mlToOz, ozToMl, BOTTLE_OZ_PRESETS, TARGET_OZ_PRESETS } from '@/lib/water'
import type { Goal, ActivityLevel } from '@/types'

const GOALS: Goal[] = ['lose_weight', 'maintain', 'build_muscle', 'improve_health']
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [useMetric, setUseMetric] = useState(true)
  // metric inputs
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  // imperial inputs
  const [weightLbs, setWeightLbs] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'prefer_not_to_say'>('prefer_not_to_say')
  const [goal, setGoal] = useState<Goal>('improve_health')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [waterBottleMl, setWaterBottleMl] = useState(ozToMl(24))   // 24 oz bottle
  const [waterTargetMl, setWaterTargetMl] = useState(ozToMl(80))   // 80 oz/day

  async function finish() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const age = birthYear ? new Date().getFullYear() - Number(birthYear) : 30
    const w = useMetric
      ? (Number(weightKg) || 70)
      : (weightLbs ? lbsToKg(Number(weightLbs)) : 70)
    const h = useMetric
      ? (Number(heightCm) || 170)
      : (heightFt ? ftInToCm(Number(heightFt), Number(heightIn) || 0) : 170)
    const bmr = calculateBMR(w, h, age, sex)
    const tdee = calculateTDEE(bmr, activityLevel)
    const calorieTarget = calculateCalorieTarget(tdee, goal)

    const hasWeight = useMetric ? !!weightKg : !!weightLbs
    const hasHeight = useMetric ? !!heightCm : !!heightFt

    const { error: err } = await supabase.from('profiles').update({
      display_name:   displayName.trim() || user.email?.split('@')[0],
      weight_kg:      hasWeight ? w : null,
      height_cm:      hasHeight ? h : null,
      birth_year:     birthYear ? Number(birthYear) : null,
      biological_sex: sex,
      goal,
      activity_level: activityLevel,
      calorie_target: calorieTarget,
      onboarding_done: true,
      water_bottle_ml: waterBottleMl,
      water_daily_target_ml: waterTargetMl,
    }).eq('id', user.id)

    if (err) { setError(err.message); setSaving(false); return }
    router.push('/dashboard')
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-stone-800">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Step indicator */}
          <p className="text-stone-400 text-sm text-center mb-8">
            Step {step} of {TOTAL_STEPS}
          </p>

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4">👋</div>
                <h1 className="text-white text-2xl font-bold">What should we call you?</h1>
                <p className="text-stone-400 text-sm mt-2">This is what your group will see</p>
              </div>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-4 py-4 text-white text-lg text-center placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => setStep(2)}
                disabled={!displayName.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors text-lg"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Body stats ── */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4">📏</div>
                <h1 className="text-white text-2xl font-bold">Your body stats</h1>
                <p className="text-stone-400 text-sm mt-2">Used to calculate your calorie targets — optional</p>
              </div>

              {/* Unit toggle */}
              <div className="flex bg-stone-800 rounded-xl p-1">
                <button
                  onClick={() => setUseMetric(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useMetric ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Metric (kg, cm)
                </button>
                <button
                  onClick={() => setUseMetric(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !useMetric ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Imperial (lbs, ft)
                </button>
              </div>

              {/* Weight */}
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">
                  Weight ({useMetric ? 'kg' : 'lbs'})
                </label>
                {useMetric ? (
                  <input
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    placeholder="70"
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <input
                    type="number"
                    value={weightLbs}
                    onChange={e => setWeightLbs(e.target.value)}
                    placeholder="154"
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Height */}
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">
                  Height ({useMetric ? 'cm' : 'ft / in'})
                </label>
                {useMetric ? (
                  <input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                    placeholder="170"
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={heightFt}
                        onChange={e => setHeightFt(e.target.value)}
                        placeholder="5"
                        min="3"
                        max="8"
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 pr-10 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">ft</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={heightIn}
                        onChange={e => setHeightIn(e.target.value)}
                        placeholder="10"
                        min="0"
                        max="11"
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 pr-10 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">in</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">Birth year</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  placeholder="1990"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-stone-400 text-xs mb-2 block">Biological sex</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['male', 'female', 'prefer_not_to_say'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${
                        sex === s ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {s === 'prefer_not_to_say' ? 'Prefer not' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Goal ── */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h1 className="text-white text-2xl font-bold">What's your goal?</h1>
                <p className="text-stone-400 text-sm mt-2">We'll tailor your calorie targets</p>
              </div>

              <div className="space-y-2">
                {GOALS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      goal === g
                        ? 'border-emerald-500 bg-emerald-900/30'
                        : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                    }`}
                  >
                    <span className="text-2xl">{GOAL_EMOJIS[g]}</span>
                    <span className={`font-medium ${goal === g ? 'text-white' : 'text-stone-300'}`}>
                      {GOAL_LABELS[g]}
                    </span>
                    {goal === g && <span className="ml-auto text-emerald-400">✓</span>}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  ← Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Activity level ── */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4">🏃</div>
                <h1 className="text-white text-2xl font-bold">How active are you?</h1>
                <p className="text-stone-400 text-sm mt-2">Sets your baseline calorie burn</p>
              </div>

              <div className="space-y-2">
                {ACTIVITY_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setActivityLevel(level)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      activityLevel === level
                        ? 'border-emerald-500 bg-emerald-900/30'
                        : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium capitalize ${activityLevel === level ? 'text-white' : 'text-stone-300'}`}>
                        {level.replace('_', ' ')}
                      </span>
                      {activityLevel === level && <span className="text-emerald-400">✓</span>}
                    </div>
                    <p className="text-stone-400 text-xs mt-0.5">{ACTIVITY_LABELS[level]}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Water intake ── */}
          {step === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4">💧</div>
                <h1 className="text-white text-2xl font-bold">Stay hydrated</h1>
                <p className="text-stone-400 text-sm mt-2">We'll remind you to drink throughout the day</p>
              </div>

              {/* Bottle size */}
              <div>
                <label className="text-stone-400 text-xs uppercase tracking-wider mb-2 block">Your bottle / glass size</label>
                <div className="grid grid-cols-4 gap-2">
                  {BOTTLE_OZ_PRESETS.map(oz => (
                    <button
                      key={oz}
                      onClick={() => setWaterBottleMl(ozToMl(oz))}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        mlToOz(waterBottleMl) === oz
                          ? 'bg-sky-700 text-white'
                          : 'bg-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {oz} oz
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-stone-400 text-xs mb-1 block">Or enter custom (oz)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={mlToOz(waterBottleMl)}
                    onChange={e => setWaterBottleMl(ozToMl(Number(e.target.value)))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Daily target */}
              <div>
                <label className="text-stone-400 text-xs uppercase tracking-wider mb-2 block">Daily water target</label>
                <div className="grid grid-cols-3 gap-2">
                  {TARGET_OZ_PRESETS.map(oz => (
                    <button
                      key={oz}
                      onClick={() => setWaterTargetMl(ozToMl(oz))}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        mlToOz(waterTargetMl) === oz
                          ? 'bg-sky-700 text-white'
                          : 'bg-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {oz} oz
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-stone-400 text-xs mb-1 block">Or enter custom (oz)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={mlToOz(waterTargetMl)}
                    onChange={e => setWaterTargetMl(ozToMl(Number(e.target.value)))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Summary chip */}
              <div className="bg-sky-950/50 border border-sky-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sky-300 text-sm">
                  {Math.ceil(waterTargetMl / waterBottleMl)} × {mlToOz(waterBottleMl)} oz bottle{Math.ceil(waterTargetMl / waterBottleMl) !== 1 ? 's' : ''} per day
                </span>
                <span className="text-sky-400 font-bold">{mlToOz(waterTargetMl)} oz</span>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(4)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  ← Back
                </button>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
                >
                  {saving ? 'Saving…' : "Let's go! 🚀"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
