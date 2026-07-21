'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvatarUpload from '@/components/AvatarUpload'
import Segmented from '@/components/Segmented'
import {
  GOAL_EMOJIS,
  calculateBMR, calculateTDEE, calculateCalorieTarget,
  lbsToKg, ftInToCm, kgToLbs, cmToFtIn,
} from '@/lib/fitness'
import { mlToOz, ozToMl, BOTTLE_OZ_PRESETS, TARGET_OZ_PRESETS } from '@/lib/water'
import { DIETS, DIET_EMOJIS } from '@/lib/diets'
import { useI18n } from '@/components/I18nProvider'
import type { Goal, ActivityLevel, Profile, Diet, FoodUnit } from '@/types'

const GOALS: Goal[] = ['lose_weight', 'maintain', 'build_muscle', 'improve_health']
// Omnivore == "no specific diet" for nutrient purposes, so it's the null option.
const DIET_CHOICES: Diet[] = DIETS.filter(d => d !== 'omnivore')
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

interface Props { profile: Profile; initialFoodUnit: FoodUnit }

export default function EditProfileClient({ profile, initialFoodUnit }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()
  const ep = t.editProfile
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [useMetric, setUseMetric] = useState(true)

  // Initialise from existing profile
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [weightKg, setWeightKg] = useState(String(profile.weight_kg ?? ''))
  const [heightCm, setHeightCm] = useState(String(profile.height_cm ?? ''))
  const [weightLbs, setWeightLbs] = useState(
    profile.weight_kg ? String(kgToLbs(profile.weight_kg)) : ''
  )
  const existingFtIn = profile.height_cm ? cmToFtIn(profile.height_cm) : null
  const [heightFt, setHeightFt] = useState(existingFtIn ? String(existingFtIn.ft) : '')
  const [heightIn, setHeightIn] = useState(existingFtIn ? String(existingFtIn.inches) : '')
  const [birthYear, setBirthYear] = useState(String(profile.birth_year ?? ''))
  const [sex, setSex] = useState<'male' | 'female' | 'prefer_not_to_say'>(
    (profile.biological_sex as any) ?? 'prefer_not_to_say'
  )
  const [goal, setGoal] = useState<Goal>((profile.goal as Goal) ?? 'improve_health')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    (profile.activity_level as ActivityLevel) ?? 'moderate'
  )
  const [diet, setDiet] = useState<Diet | null>((profile.diet as Diet) ?? null)
  // Resolved server-side (account column → device cookie → 'g'), so the toggle
  // reflects the real preference even where migration 055 isn't applied.
  const [foodUnit, setFoodUnit] = useState<FoodUnit>(initialFoodUnit)
  const [waterBottleMl, setWaterBottleMl] = useState(profile.water_bottle_ml ?? ozToMl(24))
  const [waterTargetMl, setWaterTargetMl] = useState(profile.water_daily_target_ml ?? ozToMl(64))
  const [bottleOzDraft, setBottleOzDraft] = useState(String(mlToOz(profile.water_bottle_ml ?? ozToMl(24))))
  const [targetOzDraft, setTargetOzDraft] = useState(String(mlToOz(profile.water_daily_target_ml ?? ozToMl(64))))
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
  const [targetWeightLbs, setTargetWeightLbs] = useState(
    profile.target_weight_kg ? String(kgToLbs(profile.target_weight_kg)) : ''
  )
  const [calorieTargetInput, setCalorieTargetInput] = useState(String(profile.calorie_target ?? ''))

  // Live "suggested" calorie target from the current form (Mifflin-St Jeor → TDEE → goal)
  const suggestedCalories = (() => {
    const age = birthYear ? new Date().getFullYear() - Number(birthYear) : 30
    const w = useMetric ? Number(weightKg) : (weightLbs ? lbsToKg(Number(weightLbs)) : 0)
    const h = useMetric ? Number(heightCm) : (heightFt ? ftInToCm(Number(heightFt), Number(heightIn) || 0) : 0)
    if (!w || !h) return null
    return calculateCalorieTarget(calculateTDEE(calculateBMR(w, h, age, sex), activityLevel), goal)
  })()

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError('')

    const w = useMetric
      ? (Number(weightKg) || null)
      : (weightLbs ? lbsToKg(Number(weightLbs)) : null)
    const h = useMetric
      ? (Number(heightCm) || null)
      : (heightFt ? ftInToCm(Number(heightFt), Number(heightIn) || 0) : null)

    // Use the user's own target if set, else the suggestion, else keep existing.
    const typed = Number(calorieTargetInput)
    const calorieTarget = typed > 0 ? Math.round(typed) : (suggestedCalories ?? profile.calorie_target)

    const baseUpdate = {
      display_name:          displayName.trim() || profile.display_name,
      weight_kg:             w,
      height_cm:             h,
      birth_year:            birthYear ? Number(birthYear) : null,
      biological_sex:        sex,
      goal,
      // Keep goals[] in sync: consumers (Weekly Review, MiniProfileModal)
      // read goals[0] as the primary goal, so editing `goal` alone left them
      // showing a stale goal forever (audit PR-07). Chosen goal moves to the
      // front; any other onboarding-selected goals are preserved behind it.
      goals:                 [goal, ...(profile.goals ?? []).filter(g => g !== goal)],
      activity_level:        activityLevel,
      calorie_target:        calorieTarget,
      water_bottle_ml:       waterBottleMl,
      water_daily_target_ml: waterTargetMl,
    }
    const targetKg = targetWeightLbs ? lbsToKg(Number(targetWeightLbs)) : null

    // The food unit is persisted through /api/food-unit (device cookie always,
    // profiles.food_unit when migration 055 exists) — never through the profile
    // update below, so it cannot depend on the column existing. Fired in
    // parallel with the profile write; a network failure is the only way it can
    // fail, and that surfaces as the partial-save warning.
    const unitSave = fetch('/api/food-unit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit: foodUnit }),
    }).then(r => r.ok).catch(() => false)

    // `diet` (migration 036) and `target_weight_kg` (migration 014) come from
    // later migrations. On a DB where one isn't applied yet, a combined update
    // 204s on the missing column and, bundled, would drop the other with it.
    // Fast path first (one request, the fully-migrated case); on PGRST204 fall
    // back to isolating each field, and warn if one genuinely couldn't be saved
    // instead of showing a false "Saved!".
    let { error: err } = await supabase.from('profiles')
      .update({ ...baseUpdate, diet, target_weight_kg: targetKg }).eq('id', profile.id)

    let unsavedOptionalFields = false
    if (err && err.code === 'PGRST204') {
      ;({ error: err } = await supabase.from('profiles').update(baseUpdate).eq('id', profile.id))
      const optionalFields: Record<string, unknown> = { diet, target_weight_kg: targetKg }
      for (const [key, value] of Object.entries(optionalFields)) {
        const { error: fieldErr } = await supabase.from('profiles').update({ [key]: value }).eq('id', profile.id)
        if (fieldErr) unsavedOptionalFields = true
      }
    }

    const unitSaved = await unitSave
    if (err) { setError(err.message); setSaving(false); return }
    if (unsavedOptionalFields || !unitSaved) {
      setError(ep.partialSaveWarning)
      setSaving(false)
      return
    }
    setSaved(true)
    setSaving(false)
    // Clear the client Router Cache so /profile, /log, /dashboard and a later
    // return to this edit page re-fetch the freshly-saved values (and the
    // cookie the food-unit route just set). Every other client-side write in
    // the app does this — see I18nProvider's note.
    router.refresh()
    setTimeout(() => router.push('/profile'), 900)
  }

  const inputCls = 'w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const sectionHdr = 'text-stone-400 text-xs uppercase tracking-wider mb-3'

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <div className="px-4 pt-safe pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">{ep.title}</h1>
          <p className="text-stone-400 text-xs">{ep.subtitle}</p>
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* Profile picture */}
        <div className="flex flex-col items-center gap-2">
          <AvatarUpload initialUrl={profile.avatar_url} name={displayName} size="lg" />
          <p className="text-stone-400 text-xs">{ep.tapPhoto}</p>
        </div>

        {/* Display name */}
        <div>
          <p className={sectionHdr}>{ep.displayName}</p>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={ep.namePlaceholder}
            className={inputCls}
          />
        </div>

        {/* Body stats */}
        <div>
          <p className={sectionHdr}>{ep.bodyStats}</p>
          <div className="space-y-3">
            {/* Unit toggle */}
            <div role="tablist" aria-label={ep.unitsAria} className="flex bg-stone-800 rounded-xl p-1">
              <button
                role="tab"
                aria-selected={useMetric}
                onClick={() => setUseMetric(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${useMetric ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-white'}`}
              >
                {ep.metricUnits}
              </button>
              <button
                role="tab"
                aria-selected={!useMetric}
                onClick={() => setUseMetric(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!useMetric ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-white'}`}
              >
                {ep.imperialUnits}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">{ep.weightLabel(useMetric ? 'kg' : 'lbs')}</label>
                {useMetric ? (
                  <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="70" className={inputCls} />
                ) : (
                  <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="154" className={inputCls} />
                )}
              </div>
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">{ep.heightLabel(useMetric ? 'cm' : ep.ftInUnit)}</label>
                {useMetric ? (
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170" className={inputCls} />
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative">
                      <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5" min="3" max="8" className={inputCls + ' pr-8'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">ft</span>
                    </div>
                    <div className="relative">
                      <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="10" min="0" max="11" className={inputCls + ' pr-8'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">in</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">{ep.birthYear}</label>
                <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1990" className={inputCls} />
              </div>
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">{ep.biologicalSex}</label>
                <Segmented
                  variant="fill"
                  options={(['male', 'female', 'prefer_not_to_say'] as const).map(s => ({
                    value: s,
                    label: s === 'prefer_not_to_say' ? '—' : s === 'male' ? 'M' : 'F',
                  }))}
                  value={sex}
                  onChange={setSex}
                  ariaLabel={ep.biologicalSex}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Goal */}
        <div>
          <p className={sectionHdr}>{ep.goal}</p>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map(g => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                  goal === g ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                }`}
              >
                <span>{GOAL_EMOJIS[g]}</span>
                <span className={`text-sm font-medium ${goal === g ? 'text-white' : 'text-stone-300'}`}>{t.onboarding.goalLabels[g]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div>
          <p className={sectionHdr}>{ep.diet}</p>
          <p className="text-stone-500 text-[11px] -mt-1 mb-2">{ep.dietSub}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDiet(null)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                diet === null ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
              }`}
            >
              <span>🍽️</span>
              <span className={`text-sm font-medium ${diet === null ? 'text-white' : 'text-stone-300'}`}>{ep.noDiet}</span>
            </button>
            {DIET_CHOICES.map(d => (
              <button
                key={d}
                onClick={() => setDiet(d)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                  diet === d ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                }`}
              >
                <span>{DIET_EMOJIS[d]}</span>
                <span className={`text-sm font-medium ${diet === d ? 'text-white' : 'text-stone-300'}`}>{t.diets[d]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Goal weight */}
        <div>
          <p className={sectionHdr}>{ep.goalWeight}</p>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={targetWeightLbs}
              onChange={e => setTargetWeightLbs(e.target.value)}
              placeholder={ep.goalWeightPlaceholder}
              className={inputCls + ' pr-12'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">lbs</span>
          </div>
          <p className="text-stone-400 text-[11px] mt-1.5">{ep.goalWeightHint}</p>
        </div>

        {/* Activity level */}
        <div>
          <p className={sectionHdr}>{ep.activityLevel}</p>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => setActivityLevel(level)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  activityLevel === level ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium capitalize text-sm ${activityLevel === level ? 'text-white' : 'text-stone-300'}`}>
                    {t.onboarding.activityNames[level]}
                  </span>
                  {activityLevel === level && <span className="text-emerald-400 text-xs">✓</span>}
                </div>
                <p className="text-stone-400 text-xs mt-0.5">{t.onboarding.activityDescs[level]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Daily calorie target */}
        <div>
          <p className={sectionHdr}>{ep.calorieTarget}</p>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={calorieTargetInput}
              onChange={e => setCalorieTargetInput(e.target.value)}
              placeholder={suggestedCalories ? String(suggestedCalories) : '2000'}
              className={inputCls + ' pr-14'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">kcal</span>
          </div>
          {suggestedCalories != null && (
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p className="text-stone-400 text-[11px]">{ep.suggestedLabel}<span className="text-stone-200">{ep.kcalValue(suggestedCalories)}</span></p>
              <button
                type="button"
                onClick={() => setCalorieTargetInput(String(suggestedCalories))}
                className="shrink-0 text-emerald-400 hover:text-emerald-300 text-xs font-medium underline underline-offset-2"
              >
                {ep.useSuggested}
              </button>
            </div>
          )}
        </div>

        {/* Water */}
        <div>
          <p className={sectionHdr}>{ep.hydration}</p>
          <div className="space-y-3">
            <div>
              <label className="text-stone-400 text-xs mb-2 block">{ep.bottleSize}</label>
              <div className="grid grid-cols-3 gap-2">
                {BOTTLE_OZ_PRESETS.map(oz => (
                  <button
                    key={oz}
                    onClick={() => { setWaterBottleMl(ozToMl(oz)); setBottleOzDraft(String(oz)) }}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${mlToOz(waterBottleMl) === oz && bottleOzDraft !== '' ? 'bg-sky-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
                  >
                    {oz} oz
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={bottleOzDraft}
                onChange={e => setBottleOz(e.target.value)}
                placeholder={ep.custom}
                className={inputCls + ' mt-2'}
              />
            </div>
            <div>
              <label className="text-stone-400 text-xs mb-2 block">{ep.dailyTarget}</label>
              <div className="grid grid-cols-2 gap-2">
                {TARGET_OZ_PRESETS.map(oz => (
                  <button
                    key={oz}
                    onClick={() => { setWaterTargetMl(ozToMl(oz)); setTargetOzDraft(String(oz)) }}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${mlToOz(waterTargetMl) === oz && targetOzDraft !== '' ? 'bg-sky-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
                  >
                    {oz} oz
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={targetOzDraft}
                onChange={e => setTargetOz(e.target.value)}
                placeholder={ep.custom}
                className={inputCls + ' mt-2'}
              />
            </div>
            <div className="bg-sky-950/50 border border-sky-800/40 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-sky-300 text-sm">
                {ep.bottlesPerDay(Math.ceil(waterTargetMl / waterBottleMl))}
              </span>
              <span className="text-sky-400 font-bold text-sm">{mlToOz(waterTargetMl)} oz</span>
            </div>
          </div>
        </div>

        {/* Food logging unit */}
        <div>
          <p className={sectionHdr}>{ep.foodUnit}</p>
          <p className="text-stone-400 text-xs mb-2">{ep.foodUnitIntro}</p>
          <Segmented
            variant="fill"
            options={[
              { value: 'g', label: ep.grams },
              { value: 'oz', label: ep.ounces },
            ]}
            value={foodUnit}
            onChange={setFoodUnit}
            ariaLabel={ep.foodUnitAria}
          />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

      </div>

      {/* Sticky (not fixed) so it pins to the viewport bottom while scrolling
          without the iOS position:fixed drift. The long form always scrolls. */}
      <div className="sticky bottom-0 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          <Save size={16} />
          {saved ? ep.saved : saving ? ep.saving : ep.saveChanges}
        </button>
      </div>
    </div>
  )
}
