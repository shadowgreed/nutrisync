'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'
import Segmented from '@/components/Segmented'
import { useI18n } from '@/components/I18nProvider'
import {
  GOAL_EMOJIS,
  calculateBMR, calculateTDEE, calculateCalorieTarget,
  lbsToKg, ftInToCm,
} from '@/lib/fitness'
import { mlToOz, ozToMl, BOTTLE_OZ_PRESETS, TARGET_OZ_PRESETS } from '@/lib/water'
import type { Goal, ActivityLevel } from '@/types'

const GOALS: Goal[] = ['lose_weight', 'maintain', 'build_muscle', 'improve_health']
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

// Feature emojis for the welcome screen (titles/text live in lib/i18n).
const FEATURE_EMOJIS = ['📸', '🎯', '👥', '✨']

// The data-collection steps that the progress bar tracks (welcome & reveal sit outside it).
const FORM_STEPS = 5

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()

  // step 0 = welcome, 1..5 = form, 6 = plan reveal
  const [step, setStep] = useState(0)
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
  const [goals, setGoals] = useState<Goal[]>([])
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [waterBottleMl, setWaterBottleMl] = useState(ozToMl(24))   // 24 oz bottle
  const [waterTargetMl, setWaterTargetMl] = useState(ozToMl(64))   // 64 oz/day
  // Draft strings for the custom oz inputs so they can be cleared without snapping to 0
  const [bottleOzDraft, setBottleOzDraft] = useState(String(mlToOz(ozToMl(24))))
  const [targetOzDraft, setTargetOzDraft] = useState(String(mlToOz(ozToMl(64))))

  function setBottleOz(raw: string) {
    setBottleOzDraft(raw)
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n > 0) setWaterBottleMl(ozToMl(n))
  }
  function setTargetOz(raw: string) {
    setTargetOzDraft(raw)
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n > 0) setWaterTargetMl(ozToMl(n))
  }

  // Single source of truth for the calorie maths — used by both the reveal and finish().
  const plan = useMemo(() => {
    const age = birthYear ? new Date().getFullYear() - Number(birthYear) : 30
    const w = useMetric
      ? (Number(weightKg) || 70)
      : (weightLbs ? lbsToKg(Number(weightLbs)) : 70)
    const h = useMetric
      ? (Number(heightCm) || 170)
      : (heightFt ? ftInToCm(Number(heightFt), Number(heightIn) || 0) : 170)
    const bmr = calculateBMR(w, h, age, sex)
    const tdee = calculateTDEE(bmr, activityLevel)
    const primaryGoal: Goal =
      (['lose_weight', 'build_muscle', 'maintain', 'improve_health'] as Goal[])
        .find(g => goals.includes(g)) ?? 'improve_health'
    const calorieTarget = calculateCalorieTarget(tdee, primaryGoal)
    const hasWeight = useMetric ? !!weightKg : !!weightLbs
    const hasHeight = useMetric ? !!heightCm : !!heightFt
    return { w, h, primaryGoal, calorieTarget, hasWeight, hasHeight }
  }, [birthYear, useMetric, weightKg, weightLbs, heightCm, heightFt, heightIn, sex, activityLevel, goals])

  async function finish() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const baseUpdate = {
      display_name:   displayName.trim() || user.email?.split('@')[0],
      weight_kg:      plan.hasWeight ? plan.w : null,
      height_cm:      plan.hasHeight ? plan.h : null,
      birth_year:     birthYear ? Number(birthYear) : null,
      biological_sex: sex,
      goal:           plan.primaryGoal,
      activity_level: activityLevel,
      calorie_target: plan.calorieTarget,
      onboarding_done: true,
      water_bottle_ml: waterBottleMl,
      water_daily_target_ml: waterTargetMl,
    }

    // Try saving the multi-goal array; if migration 012 (goals column) isn't applied
    // yet, retry without it so onboarding still completes.
    let { error: err } = await supabase.from('profiles')
      .update({ ...baseUpdate, goals: goals.length ? goals : [plan.primaryGoal] })
      .eq('id', user.id)
    if (err && (err.code === 'PGRST204' || /goals/.test(err.message))) {
      ;({ error: err } = await supabase.from('profiles').update(baseUpdate).eq('id', user.id))
    }

    if (err) { setError(err.message); setSaving(false); return }
    track('onboarding_completed', { goal: plan.primaryGoal, goal_count: goals.length || 1 })
    router.push('/dashboard')
  }

  const progress = step === 0 ? 0 : Math.min(step, FORM_STEPS) / FORM_STEPS * 100

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Progress bar (hidden on welcome) */}
      <div className="h-1 bg-stone-800">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Step indicator (only during the form) */}
          {step >= 1 && step <= FORM_STEPS && (
            <p className="text-stone-400 text-sm text-center mb-8">
              {t.onboarding.stepOf(step, FORM_STEPS)}
            </p>
          )}

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="space-y-7 animate-fadeIn">
              <div className="text-center">
                <div className="text-6xl mb-4" aria-hidden="true">🌿</div>
                <h1 className="text-white text-3xl font-bold leading-tight">{t.onboarding.welcomeTitle}</h1>
                <p className="text-stone-400 text-base mt-3">
                  {t.onboarding.welcomeIntro}
                </p>
              </div>

              <div className="space-y-3">
                {t.onboarding.features.map((f, i) => (
                  <div key={f.title} className="flex gap-3.5 items-start bg-stone-900 border border-stone-800 rounded-2xl p-4">
                    <span className="text-2xl shrink-0" aria-hidden="true">{FEATURE_EMOJIS[i]}</span>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm">{f.title}</p>
                      <p className="text-stone-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setStep(1)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors text-lg"
                >
                  {t.onboarding.letsSetUp}
                </button>
                <p className="text-stone-500 text-xs text-center">{t.onboarding.takesAMinute}</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4" aria-hidden="true">👋</div>
                <h1 className="text-white text-2xl font-bold">{t.onboarding.nameTitle}</h1>
                <p className="text-stone-400 text-sm mt-2">{t.onboarding.nameSub}</p>
              </div>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t.onboarding.namePlaceholder}
                autoFocus
                className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-4 py-4 text-white text-lg text-center placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.back}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!displayName.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors"
                >
                  {t.common.continueArrow}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Body stats ── */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4" aria-hidden="true">📏</div>
                <h1 className="text-white text-2xl font-bold">{t.onboarding.statsTitle}</h1>
                <p className="text-stone-400 text-sm mt-2">{t.onboarding.statsSub}</p>
              </div>

              {/* Unit toggle */}
              <div role="tablist" aria-label={t.onboarding.unitsAria} className="flex bg-stone-800 rounded-xl p-1">
                <button
                  role="tab"
                  aria-selected={useMetric}
                  onClick={() => setUseMetric(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useMetric ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t.onboarding.metric}
                </button>
                <button
                  role="tab"
                  aria-selected={!useMetric}
                  onClick={() => setUseMetric(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !useMetric ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t.onboarding.imperial}
                </button>
              </div>

              {/* Weight */}
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">
                  {t.onboarding.weightLabel} ({useMetric ? 'kg' : 'lbs'})
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
                  {t.onboarding.heightLabel} ({useMetric ? 'cm' : 'ft / in'})
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
                <label className="text-stone-400 text-xs mb-1.5 block">{t.onboarding.birthYearLabel}</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  placeholder="1990"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-stone-400 text-xs mb-2 block">{t.onboarding.sexLabel}</label>
                <Segmented
                  variant="fill"
                  options={(['male', 'female', 'prefer_not_to_say'] as const).map(s => ({
                    value: s,
                    label: s === 'prefer_not_to_say' ? t.onboarding.sexPreferNot : s === 'male' ? t.onboarding.sexMale : t.onboarding.sexFemale,
                  }))}
                  value={sex}
                  onChange={setSex}
                  ariaLabel={t.onboarding.sexLabel}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.back}
                </button>
                <button onClick={() => setStep(3)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.continueArrow}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Goals (multi-select) ── */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4" aria-hidden="true">🎯</div>
                <h1 className="text-white text-2xl font-bold">{t.onboarding.goalsTitle}</h1>
                <p className="text-stone-400 text-sm mt-2">{t.onboarding.goalsSub}</p>
              </div>

              <div className="space-y-2">
                {GOALS.map(g => {
                  const selected = goals.includes(g)
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setGoals(prev => selected ? prev.filter(x => x !== g) : [...prev, g])}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        selected ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                      }`}
                    >
                      <span className="text-2xl" aria-hidden="true">{GOAL_EMOJIS[g]}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${selected ? 'text-white' : 'text-stone-300'}`}>{t.onboarding.goalLabels[g]}</p>
                        <p className="text-stone-400 text-xs mt-0.5">{t.onboarding.goalDescs[g]}</p>
                      </div>
                      {/* Checkbox indicator (not colour-only) */}
                      <span className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                        selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-600'
                      }`} aria-hidden="true">
                        {selected && '✓'}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.back}
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={goals.length === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-colors"
                >
                  {t.common.continueArrow}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Activity level ── */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4" aria-hidden="true">🏃</div>
                <h1 className="text-white text-2xl font-bold">{t.onboarding.activityTitle}</h1>
                <p className="text-stone-400 text-sm mt-2">{t.onboarding.activitySub}</p>
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
                        {t.onboarding.activityNames[level]}
                      </span>
                      {activityLevel === level && <span className="text-emerald-400" aria-hidden="true">✓</span>}
                    </div>
                    <p className="text-stone-400 text-xs mt-0.5">{t.onboarding.activityDescs[level]}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.back}
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors"
                >
                  {t.common.continueArrow}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Water intake ── */}
          {step === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4" aria-hidden="true">💧</div>
                <h1 className="text-white text-2xl font-bold">{t.onboarding.waterTitle}</h1>
                <p className="text-stone-400 text-sm mt-2">{t.onboarding.waterSub}</p>
              </div>

              {/* Bottle size */}
              <div>
                <label className="text-stone-400 text-xs uppercase tracking-wider mb-2 block">{t.onboarding.bottleSize}</label>
                <div className="grid grid-cols-3 gap-2">
                  {BOTTLE_OZ_PRESETS.map(oz => (
                    <button
                      key={oz}
                      onClick={() => { setWaterBottleMl(ozToMl(oz)); setBottleOzDraft(String(oz)) }}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        mlToOz(waterBottleMl) === oz && bottleOzDraft !== ''
                          ? 'bg-sky-700 text-white'
                          : 'bg-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {oz} oz
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-stone-400 text-xs mb-1 block">{t.onboarding.customOz}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={bottleOzDraft}
                    onChange={e => setBottleOz(e.target.value)}
                    placeholder="oz"
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Daily target */}
              <div>
                <label className="text-stone-400 text-xs uppercase tracking-wider mb-2 block">{t.onboarding.dailyTarget}</label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_OZ_PRESETS.map(oz => (
                    <button
                      key={oz}
                      onClick={() => { setWaterTargetMl(ozToMl(oz)); setTargetOzDraft(String(oz)) }}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        mlToOz(waterTargetMl) === oz && targetOzDraft !== ''
                          ? 'bg-sky-700 text-white'
                          : 'bg-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {oz} oz
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-stone-400 text-xs mb-1 block">{t.onboarding.customOz}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={targetOzDraft}
                    onChange={e => setTargetOz(e.target.value)}
                    placeholder="oz"
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Summary chip */}
              <div className="bg-sky-950/50 border border-sky-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sky-300 text-sm">
                  {t.onboarding.bottlesPerDay(Math.ceil(waterTargetMl / waterBottleMl), mlToOz(waterBottleMl))}
                </span>
                <span className="text-sky-400 font-bold">{mlToOz(waterTargetMl)} oz</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(4)} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.back}
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors"
                >
                  {t.onboarding.seeMyPlan}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 6: Plan reveal ── */}
          {step === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <div className="text-5xl mb-4" aria-hidden="true">🎉</div>
                <h1 className="text-white text-2xl font-bold">
                  {t.onboarding.revealTitle(displayName.trim())}
                </h1>
                <p className="text-stone-400 text-sm mt-2">{t.onboarding.revealSub}</p>
              </div>

              {/* Calorie budget hero */}
              <div className="bg-gradient-to-br from-emerald-900/40 to-stone-900 border border-emerald-800/40 rounded-3xl p-6 text-center">
                <p className="text-emerald-300/80 text-xs uppercase tracking-wider">{t.onboarding.calorieBudget}</p>
                <p className="text-white text-5xl font-bold tabular-nums mt-1">{plan.calorieTarget.toLocaleString()}</p>
                <p className="text-stone-400 text-sm mt-1">{t.onboarding.tunedFor(t.onboarding.goalLabels[plan.primaryGoal])}</p>
              </div>

              {/* What happens next */}
              <div className="space-y-2.5">
                <p className="text-stone-400 text-xs uppercase tracking-wider">{t.onboarding.whatFirst}</p>
                <div className="flex gap-3 items-start">
                  <span className="text-xl shrink-0" aria-hidden="true">📸</span>
                  <p className="text-stone-300 text-sm">{t.onboarding.firstMeal}</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl shrink-0" aria-hidden="true">👥</span>
                  <p className="text-stone-300 text-sm">{t.onboarding.firstGroup}</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="text-xl shrink-0" aria-hidden="true">🔔</span>
                  <p className="text-stone-300 text-sm">{t.onboarding.firstReminders}</p>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(5)} disabled={saving} className="flex-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 font-semibold py-4 rounded-2xl transition-colors">
                  {t.common.back}
                </button>
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors text-lg"
                >
                  {saving ? t.common.saving : t.onboarding.enterApp}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
