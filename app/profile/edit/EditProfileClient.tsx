'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, LogOut, Trash2, Info, Shield, FileText, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AvatarUpload from '@/components/AvatarUpload'
import PushToggle from '@/components/PushToggle'
import ReminderSettings from '@/components/ReminderSettings'
import {
  GOAL_LABELS, GOAL_EMOJIS, ACTIVITY_LABELS,
  calculateBMR, calculateTDEE, calculateCalorieTarget,
  lbsToKg, ftInToCm, kgToLbs, cmToFtIn,
} from '@/lib/fitness'
import { mlToOz, ozToMl, BOTTLE_OZ_PRESETS, TARGET_OZ_PRESETS } from '@/lib/water'
import { DIETS, DIET_LABELS, DIET_EMOJIS } from '@/lib/diets'
import type { Goal, ActivityLevel, Profile, Diet } from '@/types'

const GOALS: Goal[] = ['lose_weight', 'maintain', 'build_muscle', 'improve_health']
// Omnivore == "no specific diet" for nutrient purposes, so it's the null option.
const DIET_CHOICES: Diet[] = DIETS.filter(d => d !== 'omnivore')
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

interface Props { profile: Profile }

export default function EditProfileClient({ profile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [useMetric, setUseMetric] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function deleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not delete account')
      await supabase.auth.signOut().catch(() => {})
      router.push('/login')
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account')
      setDeleting(false)
    }
  }

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
      activity_level:        activityLevel,
      calorie_target:        calorieTarget,
      water_bottle_ml:       waterBottleMl,
      water_daily_target_ml: waterTargetMl,
    }
    const targetKg = targetWeightLbs ? lbsToKg(Number(targetWeightLbs)) : null

    // `diet` (migration 036) and `target_weight_kg` (migration 014) come from later
    // migrations. If the DB hasn't caught up, the update 204s on the missing column —
    // fall back to the core fields so the rest of the form still saves.
    let { error: err } = await supabase.from('profiles')
      .update({ ...baseUpdate, diet, target_weight_kg: targetKg }).eq('id', profile.id)
    if (err && err.code === 'PGRST204') {
      ;({ error: err } = await supabase.from('profiles').update(baseUpdate).eq('id', profile.id))
    }

    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    setTimeout(() => router.push('/profile'), 900)
  }

  const inputCls = 'w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const sectionHdr = 'text-stone-400 text-xs uppercase tracking-wider mb-3'

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">Edit profile</h1>
          <p className="text-stone-400 text-xs">Changes recalculate your calorie target</p>
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* Profile picture */}
        <div className="flex flex-col items-center gap-2">
          <AvatarUpload initialUrl={profile.avatar_url} name={displayName} size="lg" />
          <p className="text-stone-400 text-xs">Tap to change your photo</p>
        </div>

        {/* Display name */}
        <div>
          <p className={sectionHdr}>Display name</p>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            className={inputCls}
          />
        </div>

        {/* Body stats */}
        <div>
          <p className={sectionHdr}>Body stats</p>
          <div className="space-y-3">
            {/* Unit toggle */}
            <div className="flex bg-stone-800 rounded-xl p-1">
              <button
                onClick={() => setUseMetric(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${useMetric ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'}`}
              >
                Metric (kg, cm)
              </button>
              <button
                onClick={() => setUseMetric(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!useMetric ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'}`}
              >
                Imperial (lbs, ft)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">Weight ({useMetric ? 'kg' : 'lbs'})</label>
                {useMetric ? (
                  <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="70" className={inputCls} />
                ) : (
                  <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="154" className={inputCls} />
                )}
              </div>
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">Height ({useMetric ? 'cm' : 'ft / in'})</label>
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
                <label className="text-stone-400 text-xs mb-1.5 block">Birth year</label>
                <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1990" className={inputCls} />
              </div>
              <div>
                <label className="text-stone-400 text-xs mb-1.5 block">Biological sex</label>
                <div className="flex gap-1.5">
                  {(['male', 'female', 'prefer_not_to_say'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={`flex-1 py-3 rounded-xl text-xs font-medium transition-colors ${sex === s ? 'bg-emerald-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
                    >
                      {s === 'prefer_not_to_say' ? '—' : s === 'male' ? 'M' : 'F'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Goal */}
        <div>
          <p className={sectionHdr}>Goal</p>
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
                <span className={`text-sm font-medium ${goal === g ? 'text-white' : 'text-stone-300'}`}>{GOAL_LABELS[g]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div>
          <p className={sectionHdr}>Diet</p>
          <p className="text-stone-500 text-[11px] -mt-1 mb-2">Tailors your nutrient insights — we won&apos;t flag what your diet naturally runs low on.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDiet(null)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                diet === null ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
              }`}
            >
              <span>🍽️</span>
              <span className={`text-sm font-medium ${diet === null ? 'text-white' : 'text-stone-300'}`}>No specific diet</span>
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
                <span className={`text-sm font-medium ${diet === d ? 'text-white' : 'text-stone-300'}`}>{DIET_LABELS[d]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Goal weight */}
        <div>
          <p className={sectionHdr}>Goal weight</p>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={targetWeightLbs}
              onChange={e => setTargetWeightLbs(e.target.value)}
              placeholder="e.g. 165"
              className={inputCls + ' pr-12'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">lbs</span>
          </div>
          <p className="text-stone-400 text-[11px] mt-1.5">Optional — we&apos;ll track your progress and celebrate milestones on Trends.</p>
        </div>

        {/* Activity level */}
        <div>
          <p className={sectionHdr}>Activity level</p>
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
                    {level.replace('_', ' ')}
                  </span>
                  {activityLevel === level && <span className="text-emerald-400 text-xs">✓</span>}
                </div>
                <p className="text-stone-400 text-xs mt-0.5">{ACTIVITY_LABELS[level]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Daily calorie target */}
        <div>
          <p className={sectionHdr}>Daily calorie target</p>
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
              <p className="text-stone-400 text-[11px]">Suggested for your stats &amp; goal: <span className="text-stone-200">{suggestedCalories} kcal</span></p>
              <button
                type="button"
                onClick={() => setCalorieTargetInput(String(suggestedCalories))}
                className="shrink-0 text-emerald-400 hover:text-emerald-300 text-xs font-medium underline underline-offset-2"
              >
                Use suggested
              </button>
            </div>
          )}
        </div>

        {/* Water */}
        <div>
          <p className={sectionHdr}>Hydration</p>
          <div className="space-y-3">
            <div>
              <label className="text-stone-400 text-xs mb-2 block">Bottle / glass size</label>
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
                placeholder="Custom (oz)"
                className={inputCls + ' mt-2'}
              />
            </div>
            <div>
              <label className="text-stone-400 text-xs mb-2 block">Daily target</label>
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
                placeholder="Custom (oz)"
                className={inputCls + ' mt-2'}
              />
            </div>
            <div className="bg-sky-950/50 border border-sky-800/40 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-sky-300 text-sm">
                {Math.ceil(waterTargetMl / waterBottleMl)} bottles per day
              </span>
              <span className="text-sky-400 font-bold text-sm">{mlToOz(waterTargetMl)} oz</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Account */}
        <div>
          <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Account</p>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl">
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-stone-300 hover:text-white text-sm font-medium transition-colors"
            >
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>

        {/* Notifications — push enable/disable + test, and reminder schedule */}
        <div className="space-y-3">
          <p className={sectionHdr}>Notifications</p>
          <PushToggle />
          <ReminderSettings />
        </div>

        {/* Help — legal docs, about, and account deletion */}
        <div>
          <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Help</p>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800">
            <Link href="/about" className="flex items-center gap-2.5 px-4 py-3.5 text-stone-300 hover:text-white text-sm font-medium transition-colors">
              <Info size={16} aria-hidden="true" /> About us
              <ChevronRight size={16} className="ml-auto text-stone-500" aria-hidden="true" />
            </Link>
            <Link href="/privacy" className="flex items-center gap-2.5 px-4 py-3.5 text-stone-300 hover:text-white text-sm font-medium transition-colors">
              <Shield size={16} aria-hidden="true" /> Privacy Policy
              <ChevronRight size={16} className="ml-auto text-stone-500" aria-hidden="true" />
            </Link>
            <Link href="/terms" className="flex items-center gap-2.5 px-4 py-3.5 text-stone-300 hover:text-white text-sm font-medium transition-colors">
              <FileText size={16} aria-hidden="true" /> Terms of Service
              <ChevronRight size={16} className="ml-auto text-stone-500" aria-hidden="true" />
            </Link>

            {confirmDelete ? (
              <div className="px-4 py-3.5 space-y-3">
                <p className="text-stone-300 text-sm">
                  Delete your account? This permanently erases your profile, meals, water, activity, and group membership. This cannot be undone.
                </p>
                {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={deleting}
                    className="bg-red-900/70 hover:bg-red-900 text-red-100 text-sm font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete everything'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(false); setDeleteError('') }}
                    disabled={deleting}
                    className="text-stone-300 hover:text-white text-sm px-2 py-2 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center gap-2.5 px-4 py-3.5 text-stone-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                <Trash2 size={16} aria-hidden="true" /> Delete account
              </button>
            )}
          </div>
          <p className="text-stone-600 text-[11px] mt-2 px-1">
            To remove the app from your device, also uninstall it from your home screen.
          </p>
        </div>

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
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
