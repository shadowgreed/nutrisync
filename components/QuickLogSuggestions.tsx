'use client'

import { useEffect, useState } from 'react'
import { Plus, History, RotateCcw } from 'lucide-react'
import type { FoodEntry, MealType, FoodUnit } from '@/types'
import { formatServing } from '@/lib/foodUnit'
import { useI18n } from '@/components/I18nProvider'
import { track } from '@/lib/analytics-client'

// "Your usual" quick-log suggestions, derived from the user's own history via
// GET /api/quick-log. Deliberately a separate component from MealLogger
// (audit PR-08: don't grow another god component). Adding a suggestion only
// pre-fills MealLogger state — saving still goes through /api/log-meal.
//
// MealLogger only mounts this for mealType === 'snack' — snacking is the
// most habitual/repetitive meal type, so it's where "your usual" pays off.
// The component itself stays meal-type-generic in case that scope widens
// later; lib/quick-log.ts's ranking is a hard filter on the requested meal
// type either way, so it never blends in habits from other meals.

interface RankedFood {
  entry: FoodEntry
  timesLogged: number
  lastLoggedAt: string
}

interface RankedMeal {
  names: string[]
  entries: FoodEntry[]
  totalCalories: number
  timesLogged: number
}

interface Props {
  mealType: MealType
  onAddFood: (f: FoodEntry) => void
  onAddMeal: (entries: FoodEntry[]) => void
  foodUnit?: FoodUnit
}

export default function QuickLogSuggestions({ mealType, onAddFood, onAddMeal, foodUnit = 'g' }: Props) {
  const { t } = useI18n()
  const [foods, setFoods] = useState<RankedFood[]>([])
  const [meals, setMeals] = useState<RankedMeal[]>([])
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/quick-log?meal=${mealType}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => {
        if (!d?.error) {
          setFoods(d.foods ?? [])
          setMeals(d.meals ?? [])
        }
      })
      // Suggestions are progressive enhancement — on failure, render nothing
      // rather than an error state.
      .catch(() => {})
    return () => ctrl.abort()
  }, [mealType])

  function addFood(rf: RankedFood) {
    onAddFood(rf.entry)
    // Silent-status-message gap is an app-wide WCAG 4.1.3 failure (audit
    // PR-26) — announce additions instead of extending the pattern.
    setAnnouncement(t.quickLog.addedAnnouncement(rf.entry.name, Math.round(rf.entry.calories)))
    track('quick_log_used', { source: 'recent_food', meal_type: mealType })
  }

  function addMeal(rm: RankedMeal) {
    onAddMeal(rm.entries)
    setAnnouncement(t.quickLog.addedMealAnnouncement(rm.entries.length, rm.totalCalories))
    track('quick_log_used', { source: 'repeat_meal', meal_type: mealType })
  }

  function mealLabel(rm: RankedMeal): string {
    const shown = rm.names.slice(0, 2).join(' + ')
    const rest = rm.names.length - 2
    return rest > 0 ? `${shown} ${t.quickLog.moreItems(rest)}` : shown
  }

  // No history yet (new user) or nothing for this meal type — render nothing.
  if (!foods.length && !meals.length) return null

  return (
    <div className="space-y-2">
      {/* Screen-reader announcements for add actions */}
      <p aria-live="polite" className="sr-only">{announcement}</p>

      <div className="flex items-center gap-1.5">
        <History size={13} className="text-stone-400" aria-hidden="true" />
        <h3 className="text-stone-400 text-xs font-medium">{t.quickLog.title}</h3>
      </div>

      {/* "Log it again" — repeated full meals for this meal type */}
      {meals.length > 0 && (
        <ul className="space-y-1.5">
          {meals.map((rm, i) => (
            <li key={i}>
              <button
                onClick={() => addMeal(rm)}
                aria-label={t.quickLog.addMealAria(mealLabel(rm), rm.totalCalories)}
                className="w-full flex items-center gap-2.5 bg-stone-800/60 hover:bg-stone-700 border border-stone-700 rounded-xl px-3 py-2.5 text-left transition-colors"
              >
                <RotateCcw size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-white text-sm truncate">{mealLabel(rm)}</span>
                  <span className="block text-stone-400 text-xs">
                    {rm.totalCalories} kcal · {t.quickLog.timesLogged(rm.timesLogged)}
                  </span>
                </span>
                <span className="shrink-0 text-emerald-400 text-xs font-semibold">{t.quickLog.repeatMeal}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Recent foods — ranked for this meal type, one tap at the usual portion */}
      {foods.length > 0 && (
        <ul className="rounded-xl border border-stone-700 overflow-hidden divide-y divide-stone-800">
          {foods.map((rf, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2 bg-stone-800/40">
              <span className="flex-1 min-w-0">
                <span className="block text-white text-sm truncate">{rf.entry.name}</span>
                <span className="block text-stone-400 text-xs">
                  {Math.round(rf.entry.calories)} kcal · {formatServing(rf.entry.servingSizeG, foodUnit)}
                </span>
              </span>
              <button
                onClick={() => addFood(rf)}
                aria-label={t.quickLog.addAria(rf.entry.name)}
                className="shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg p-1.5 transition-colors"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
