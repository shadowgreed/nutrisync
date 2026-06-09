'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, CheckCircle, MessageSquarePlus, Pencil, ScanLine } from 'lucide-react'
import FoodSearchBar from './FoodSearchBar'
import BarcodeScanner from './BarcodeScanner'
import { createClient } from '@/lib/supabase/client'
import { NUTRIENT_KEYS } from '@/lib/nutrients'
import { MACRO_KEYS } from '@/lib/macros'
import type { FoodEntry, MealType } from '@/types'

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
  const [mealType, setMealType] = useState<MealType>(smartDefaultMeal)
  const [foods, setFoods] = useState<FoodEntry[]>([])
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)  // local blob: URL, preview only
  const [photoFile, setPhotoFile] = useState<File | null>(null)  // the real file, uploaded on save
  const [caption, setCaption] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  // Raw text of each row's gram input, keyed by index, so the field can be cleared mid-edit
  const [servingDrafts, setServingDrafts] = useState<Record<number, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const totalCalories = Math.round(foods.reduce((s, f) => s + (f.calories ?? 0), 0))

  function updateServing(i: number, raw: string) {
    setServingDrafts(d => ({ ...d, [i]: raw }))
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n) && n > 0 && n <= 3000) {
      setFoods(prev => prev.map((f, idx) => (idx === i ? rescaleFood(f, n) : f)))
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
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    setError('')
    const formData = new FormData()
    formData.append('photo', file)
    try {
      const res = await fetch('/api/analyze-photo', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFoods(prev => [...prev, ...data.foods])
      setPhotoFile(file)
      setPhotoUrl(URL.createObjectURL(file))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Photo analysis failed')
    } finally {
      setAnalyzing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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
      // Upload the photo to Supabase Storage so it persists and is visible to the
      // whole group (a local blob: URL only works in the uploader's session).
      let storedPhotoUrl: string | null = null
      if (photoFile) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
          const path = `${user.id}/${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('meal-photos')
            .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg', upsert: false })
          if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`)
          storedPhotoUrl = supabase.storage.from('meal-photos').getPublicUrl(path).data.publicUrl
        }
      }

      const res = await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: mealType, foods, photo_url: storedPhotoUrl, caption }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSaved(true)
      setTimeout(() => {
        setFoods([])
        if (photoUrl) URL.revokeObjectURL(photoUrl)
        setPhotoUrl(null)
        setPhotoFile(null)
        setCaption('')
        setSaved(false)
        onLogged?.()
      }, 1400)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
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
                {meta.label}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{meta.desc}</p>
            </div>
            {mealType === key && <span className="ml-auto text-emerald-400 text-xs font-bold">✓</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Photo upload */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

          {photoUrl ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={photoUrl} alt="Meal" className="w-full aspect-[4/3] object-cover" />
              <button
                onClick={() => { if (photoUrl) URL.revokeObjectURL(photoUrl); setPhotoUrl(null); setPhotoFile(null); setFoods([]); setCaption('') }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white transition-colors"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-2 left-2">
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {foods.length} item{foods.length !== 1 ? 's' : ''} detected
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 border border-dashed border-stone-600 rounded-xl py-4 text-stone-400 hover:text-white transition-colors disabled:opacity-50 text-sm"
            >
              {analyzing ? (
                <><Loader2 size={15} className="animate-spin" /> Analyzing photo…</>
              ) : (
                <><Camera size={15} /> Scan meal</>
              )}
            </button>
          )}
        </div>

        {/* Caption input — shown as soon as there's a photo */}
        {photoUrl && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <MessageSquarePlus size={13} className="text-stone-400" />
              <label className="text-stone-400 text-xs">Add a caption (optional)</label>
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 200))}
              placeholder="What's on your plate? Add a note for your group…"
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
            <FoodSearchBar onAdd={f => setFoods(prev => [...prev, f])} />
          </div>
          <button
            onClick={() => setShowScanner(true)}
            aria-label="Scan barcode"
            className="shrink-0 flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl px-3 text-stone-300 hover:text-white text-sm transition-colors"
          >
            <ScanLine size={16} className="text-emerald-400" />
            Scan
          </button>
        </div>

        {/* Food list */}
        {foods.length > 0 && (
          <div className="rounded-xl border border-stone-700 overflow-hidden">
            <ul className="divide-y divide-stone-800">
              {foods.map((f, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5 bg-stone-800/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{f.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {/* Editable portion */}
                      <div className="flex items-center bg-stone-700/70 rounded-md pl-1.5 pr-1 py-0.5 gap-0.5">
                        <Pencil size={9} className="text-stone-400 shrink-0" />
                        <input
                          type="number"
                          min={1}
                          max={3000}
                          inputMode="numeric"
                          value={servingDrafts[i] ?? String(f.servingSizeG)}
                          onChange={e => updateServing(i, e.target.value)}
                          onBlur={() => commitServing(i)}
                          aria-label={`Serving size for ${f.name} in grams`}
                          className="w-12 bg-transparent text-stone-200 text-xs text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-stone-400 text-xs">g</span>
                      </div>
                      {f.macros && (f.macros.protein_g > 0 || f.macros.carbs_g > 0 || f.macros.fat_g > 0) && (
                        <span className="text-stone-400 text-xs">
                          P {Math.round(f.macros.protein_g)} · C {Math.round(f.macros.carbs_g)} · F {Math.round(f.macros.fat_g)}
                        </span>
                      )}
                    </div>
                  </div>
                  {f.calories > 0 && (
                    <span className="text-emerald-400 text-xs font-medium shrink-0 tabular-nums">{Math.round(f.calories)} kcal</span>
                  )}
                  <button onClick={() => removeFood(i)} aria-label={`Remove ${f.name}`} className="text-stone-400 hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            {totalCalories > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-stone-800 border-t border-stone-700">
                <span className="text-stone-400 text-xs">Total</span>
                <span className="text-white font-semibold text-sm">{totalCalories} kcal</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

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
              <CheckCircle size={16} /> {MEAL_META[mealType].emoji} {MEAL_META[mealType].label} logged!
            </span>
          ) : saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Saving…
            </span>
          ) : (
            `Log ${MEAL_META[mealType].label}${foods.length > 0 ? ` (${foods.length} item${foods.length > 1 ? 's' : ''})` : ''}`
          )}
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onAdd={f => setFoods(prev => [...prev, f])}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
