'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Camera, X, Loader2, CheckCircle, MessageSquarePlus, ScanLine, Users } from 'lucide-react'
import FoodSearchBar from './FoodSearchBar'
import AiDisclaimer from './AiDisclaimer'
import { createClient } from '@/lib/supabase/client'
import { NUTRIENT_KEYS } from '@/lib/nutrients'
import { MACRO_KEYS } from '@/lib/macros'
import type { FoodEntry, MealType } from '@/types'
import { useI18n } from '@/components/I18nProvider'

// The barcode scanner pulls in the heavy @zxing libraries. Load it only when the
// user actually opens the scanner so it stays out of the initial /log bundle.
const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false })

// Rescale a food's calories/macros/micros linearly to a new serving size in grams.
// Everything stays as a precise float (no rounding) so repeated per-keystroke rescales
// don't compound rounding error — calories are rounded only at display/save time.
function rescaleFood(food: FoodEntry, newG: number): FoodEntry {
  const factor = newG / (food.servingSizeG || 1)
  const macros = { ...food.macros }
  for (const k of MACRO_KEYS) macros[k] = (food.macros[k] ?? 0) * factor
  const nutrients = { ...food.nutrients }
  for (const k of NUTRIENT_KEYS) nutrients[k] = (food.nutrients[k] ?? 0) * factor
  return { ...food, servingSizeG: newG, calories: food.calories * factor, macros, nutrients }
}

// Portion presets — a multiple of the food's standard serving.
const SIZE_OPTIONS: { key: string; label: string; factor: number }[] = [
  { key: 'S', label: 'Small',  factor: 0.5 },
  { key: 'M', label: 'Medium', factor: 1 },
  { key: 'L', label: 'Large',  factor: 1.5 },
]

// Capture the food's incoming serving as the "1 medium serving" reference so the
// S/M/L + quantity controls have a stable base to scale from.
function initFood(f: FoodEntry): FoodEntry {
  return {
    ...f,
    baseServingG: f.baseServingG ?? f.servingSizeG ?? 1,
    sizeFactor: f.sizeFactor ?? 1,
    quantity: f.quantity ?? 1,
  }
}

const MEAL_META: Record<MealType, { label: string; emoji: string; desc: string }> = {
  breakfast: { label: 'Breakfast', emoji: '🌅', desc: 'Morning fuel' },
  lunch:     { label: 'Lunch',     emoji: '☀️', desc: 'Midday meal' },
  dinner:    { label: 'Dinner',    emoji: '🌙', desc: 'Evening meal' },
  snack:     { label: 'Snack',     emoji: '🍎', desc: 'Between meals' },
}

function smartDefaultMeal(): MealType {
  const h = new Date().getHours()
  if (h >= 5 && h < 11)  return 'breakfast'
  if (h >= 11 && h < 15) return 'lunch'
  if (h >= 15 && h < 18) return 'snack'
  if (h >= 18 && h < 22) return 'dinner'
  return 'snack'
}

interface Props { onLogged?: () => void }

export default function MealLogger({ onLogged }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const [mealType, setMealType] = useState<MealType>(smartDefaultMeal)
  const [foods, setFoods] = useState<FoodEntry[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]) // blob: URLs, preview only
  const [photoFiles, setPhotoFiles] = useState<File[]>([])         // real files, uploaded on save
  const [caption, setCaption] = useState('')
  const [shareToFeed, setShareToFeed] = useState(true)
  const [reportedEstimate, setReportedEstimate] = useState(false)

  // "Report incorrect estimate" — AI-content feedback path (store compliance).
  async function reportEstimate() {
    if (reportedEstimate) return
    setReportedEstimate(true)
    try {
      await fetch('/api/ai-feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'incorrect_estimate', context: 'meal_logger', detail: foods.map(f => f.name).join(', ').slice(0, 280) }),
      })
    } catch { /* best-effort */ }
  }
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  // Raw text of each row's gram input, keyed by index, so the field can be cleared mid-edit
  const [servingDrafts, setServingDrafts] = useState<Record<number, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const totalCalories = Math.round(foods.reduce((s, f) => s + (f.calories ?? 0), 0))

  // Single entry point for any portion change (size preset, quantity, or exact
  // grams). Recomputes the food's grams from its base serving and rescales.
  function setPortion(i: number, opts: { sizeFactor?: number; quantity?: number; grams?: number }) {
    setFoods(prev => prev.map((f, idx) => {
      if (idx !== i) return f
      const base = f.baseServingG || f.servingSizeG || 1
      const qty = opts.quantity ?? f.quantity ?? 1
      const sf = opts.sizeFactor ?? f.sizeFactor ?? 1
      const targetG = opts.grams != null ? opts.grams : Math.max(1, base * sf * qty)
      const rescaled = rescaleFood(f, targetG)
      return {
        ...rescaled,
        baseServingG: base,
        quantity: qty,
        // Typing exact grams implies a custom size factor; keep S/M/L in sync.
        sizeFactor: opts.grams != null ? targetG / (base * qty) : sf,
      }
    }))
  }

  function updateServing(i: number, raw: string) {
    setServingDrafts(d => ({ ...d, [i]: raw }))
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n > 0 && n <= 3000) {
      setPortion(i, { grams: n })
    }
  }

  function commitServing(i: number) {
    // On blur, drop the draft so the field re-syncs to the food's actual serving size
    setServingDrafts(d => {
      const next = { ...d }
      delete next[i]
      return next
    })
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const MAX_PHOTOS = 5
    const MAX_BYTES = 8 * 1024 * 1024
    let files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/') && f.size <= MAX_BYTES)
    const room = MAX_PHOTOS - photoFiles.length
    if (room <= 0) {
      setError(t.logger.maxPhotos(MAX_PHOTOS))
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    files = files.slice(0, room)
    if (!files.length) {
      setError(t.logger.photosTooBig)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      // Analyze every selected photo at once; each contributes its detected foods.
      const settled = await Promise.allSettled(files.map(async (file) => {
        const fd = new FormData()
        fd.append('photo', file)
        const res = await fetch('/api/analyze-photo', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        return { file, foods: (data.foods as FoodEntry[]).map(initFood) }
      }))
      const ok = settled.filter((s): s is PromiseFulfilledResult<{ file: File; foods: FoodEntry[] }> => s.status === 'fulfilled').map(s => s.value)
      if (ok.length) {
        setFoods(prev => [...prev, ...ok.flatMap(r => r.foods)])
        setPhotoFiles(prev => [...prev, ...ok.map(r => r.file)])
        setPhotoPreviews(prev => [...prev, ...ok.map(r => URL.createObjectURL(r.file))])
      }
      const failed = settled.length - ok.length
      if (failed) setError(t.logger.analyzeFailed(failed))
    } finally {
      setAnalyzing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removePhoto(i: number) {
    setPhotoPreviews(prev => {
      const url = prev[i]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, idx) => idx !== i)
    })
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  function removeFood(i: number) {
    setFoods(prev => prev.filter((_, idx) => idx !== i))
    setServingDrafts({}) // indices shift after removal — reset drafts
  }

  async function handleSave() {
    if (!foods.length) return
    setSaving(true)
    setError('')
    try {
      // Upload every photo to Supabase Storage so they persist and are visible to
      // the group (a local blob: URL only works in the uploader's session).
      let storedUrls: string[] = []
      if (photoFiles.length) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          storedUrls = await Promise.all(photoFiles.map(async (pf, idx) => {
            const ext = (pf.name.split('.').pop() || 'jpg').toLowerCase()
            const path = `${user.id}/${Date.now()}-${idx}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('meal-photos')
              .upload(path, pf, { contentType: pf.type || 'image/jpeg', upsert: false })
            if (upErr) throw new Error(t.logger.uploadFailed(upErr.message))
            return supabase.storage.from('meal-photos').getPublicUrl(path).data.publicUrl
          }))
        }
      }

      const res = await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_type: mealType,
          foods,
          photo_url: storedUrls[0] ?? null,
          photo_urls: storedUrls,
          caption,
          shared_to_feed: shareToFeed,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      setTimeout(() => {
        setFoods([])
        photoPreviews.forEach(u => URL.revokeObjectURL(u))
        setPhotoPreviews([])
        setPhotoFiles([])
        setCaption('')
        setShareToFeed(true)
        setSaved(false)
        onLogged?.()
        router.push('/trends')
      }, 1400)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.logger.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
      {/* Meal type selector — 2×2 grid */}
      <div className="grid grid-cols-2 gap-px bg-stone-800">
        {(Object.entries(MEAL_META) as [MealType, typeof MEAL_META[MealType]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setMealType(key)}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              mealType === key
                ? 'bg-emerald-800/60 text-white'
                : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{meta.emoji}</span>
            <div className="text-left">
              <p className={`text-sm font-semibold leading-none ${mealType === key ? 'text-emerald-400' : ''}`}>
                {t.mealTypes[key].label}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{t.mealTypes[key].desc}</p>
            </div>
            {mealType === key && <span className="ml-auto text-emerald-400 text-xs font-bold">✓</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Photo upload — one or many; each photo is analyzed */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhoto} className="hidden" />

          {photoPreviews.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt={t.logger.mealPhotoAlt(i + 1)} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      aria-label={t.logger.removePhotoAria(i + 1)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1 text-white transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={analyzing}
                  aria-label={t.logger.addMorePhotos}
                  className="aspect-square rounded-xl border border-dashed border-stone-600 flex items-center justify-center text-stone-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {analyzing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
              </div>
              <p className="text-stone-400 text-xs">
                {t.logger.itemsDetected(foods.length)}
              </p>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 border border-dashed border-stone-600 rounded-xl py-4 text-stone-400 hover:text-white transition-colors disabled:opacity-50 text-sm"
            >
              {analyzing ? (
                <><Loader2 size={15} className="animate-spin" /> {t.logger.analyzing}</>
              ) : (
                <><Camera size={15} /> {t.logger.scanMeal}</>
              )}
            </button>
          )}
        </div>

        {/* Caption input — shown as soon as there's a photo */}
        {photoPreviews.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquarePlus size={13} className="text-stone-400" />
              <label className="text-stone-400 text-xs">{t.logger.captionLabel}</label>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 200))}
              placeholder={t.logger.captionPlaceholder}
              rows={2}
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            {caption.length > 150 && (
              <p className="text-stone-400 text-xs text-right mt-0.5">{caption.length}/200</p>
            )}
          </div>
        )}

        {/* Manual food search + barcode scan */}
        <div className="flex gap-2">
          <div className="flex-1">
            <FoodSearchBar onAdd={f => setFoods(prev => [...prev, initFood(f)])} />
          </div>
          <button
            onClick={() => setShowScanner(true)}
            aria-label={t.logger.scanBarcodeAria}
            className="shrink-0 flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl px-3 text-stone-300 hover:text-white text-sm transition-colors"
          >
            <ScanLine size={16} className="text-emerald-400" />
            {t.logger.scan}
          </button>
        </div>

        {/* Food list */}
        {foods.length > 0 && (
          <div className="rounded-xl border border-stone-700 overflow-hidden">
            <ul className="divide-y divide-stone-800">
              {foods.map((f, i) => {
                const qty = f.quantity ?? 1
                const activeFactor = f.sizeFactor ?? 1
                return (
                  <li key={i} className="px-3 py-3 bg-stone-800/40 space-y-2">
                    {/* Name + calories + remove */}
                    <div className="flex items-center gap-3">
                      <p className="flex-1 min-w-0 text-white text-sm truncate">{f.name}</p>
                      {f.calories > 0 && (
                        <span className="text-emerald-400 text-xs font-semibold shrink-0 tabular-nums">{Math.round(f.calories)} kcal</span>
                      )}
                      <button onClick={() => removeFood(i)} aria-label={t.logger.removeFoodAria(f.name)} className="text-stone-400 hover:text-red-400 transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Portion: Small / Medium / Large + quantity */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex rounded-lg bg-stone-700/60 p-0.5" role="group" aria-label={t.logger.portionSizeAria(f.name)}>
                        {SIZE_OPTIONS.map(s => {
                          const active = Math.abs(activeFactor - s.factor) < 0.05
                          return (
                            <button
                              key={s.key}
                              onClick={() => setPortion(i, { sizeFactor: s.factor })}
                              aria-pressed={active}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                active ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:text-white'
                              }`}
                            >
                              {t.logger.sizes[s.key as keyof typeof t.logger.sizes] ?? s.label}
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center bg-stone-700/60 rounded-lg" role="group" aria-label={t.logger.servingsAria(f.name)}>
                        <button onClick={() => setPortion(i, { quantity: Math.max(1, qty - 1) })} aria-label={t.logger.fewerServings} className="px-2.5 py-1 text-stone-300 hover:text-white text-sm leading-none">−</button>
                        <span className="px-1 text-stone-100 text-xs tabular-nums min-w-[2.25rem] text-center">×{qty}</span>
                        <button onClick={() => setPortion(i, { quantity: Math.min(20, qty + 1) })} aria-label={t.logger.moreServings} className="px-2.5 py-1 text-stone-300 hover:text-white text-sm leading-none">+</button>
                      </div>
                    </div>

                    {/* Exact grams (fine-tune) + macro preview */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-stone-400">
                      <span aria-hidden="true">≈</span>
                      <div className="flex items-center bg-stone-700/40 rounded-md pl-1.5 pr-1 py-0.5 gap-0.5">
                        <input
                          type="number"
                          min={1}
                          max={3000}
                          inputMode="numeric"
                          value={servingDrafts[i] ?? String(Math.round(f.servingSizeG))}
                          onChange={e => updateServing(i, e.target.value)}
                          onBlur={() => commitServing(i)}
                          aria-label={t.logger.exactGramsAria(f.name)}
                          className="w-12 bg-transparent text-stone-200 text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span>g</span>
                      </div>
                      {f.macros && (f.macros.protein_g > 0 || f.macros.carbs_g > 0 || f.macros.fat_g > 0) && (
                        <span>P {Math.round(f.macros.protein_g)} · C {Math.round(f.macros.carbs_g)} · F {Math.round(f.macros.fat_g)}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {totalCalories > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-stone-800 border-t border-stone-700">
                <span className="text-stone-400 text-xs">{t.logger.total}</span>
                <span className="text-white font-semibold text-sm">{totalCalories} kcal</span>
              </div>
            )}
          </div>
        )}

        {/* AI disclosure + feedback — shown whenever AI-estimated foods are present */}
        {foods.length > 0 && (
          <div className="space-y-1.5">
            <AiDisclaimer />
            <button
              type="button"
              onClick={reportEstimate}
              disabled={reportedEstimate}
              className="text-stone-500 hover:text-stone-300 text-[11px] underline underline-offset-2 disabled:no-underline disabled:text-emerald-400"
            >
              {reportedEstimate ? t.logger.reportSent : t.logger.reportEstimate}
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Share to group feed toggle */}
        <button
          type="button"
          onClick={() => setShareToFeed(v => !v)}
          aria-pressed={shareToFeed}
          className="w-full flex items-center justify-between gap-3 bg-stone-800/60 rounded-xl px-3.5 py-3 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Users size={15} className={shareToFeed ? 'text-emerald-400 shrink-0' : 'text-stone-500 shrink-0'} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-white text-sm font-medium">{t.logger.shareToFeed}</p>
              <p className="text-stone-400 text-xs truncate">{shareToFeed ? t.logger.groupWillSee : t.logger.keptPrivate}</p>
            </div>
          </div>
          <span className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${shareToFeed ? 'bg-emerald-600' : 'bg-stone-600'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${shareToFeed ? 'left-[1.125rem]' : 'left-0.5'}`} />
          </span>
        </button>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!foods.length || saving || saved}
          className={`w-full py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-40 text-sm ${
            saved ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {saved ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle size={16} /> {MEAL_META[mealType].emoji} {t.mealTypes[mealType].logged}
            </span>
          ) : saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> {t.common.saving}
            </span>
          ) : (
            t.logger.logMeal(t.mealTypes[mealType].label, foods.length)
          )}
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onAdd={f => setFoods(prev => [...prev, initFood(f)])}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
