'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import type { FoodEntry, NutrientTotals, MacroTotals } from '@/types'
import { emptyTotals } from '@/lib/nutrients'
import { emptyMacros, scaleMacros } from '@/lib/macros'

interface SearchResult {
  fdcId: string
  name: string
  defaultServingG: number
  servingUnit: string
  nutrientsPer100g: NutrientTotals
  macrosPer100g: MacroTotals
  caloriesPer100g: number
}

interface Props {
  onAdd: (food: FoodEntry) => void
}

function scaleNutrients(per100g: NutrientTotals, servingG: number): NutrientTotals {
  const scale = servingG / 100
  const result = emptyTotals()
  for (const k of Object.keys(result) as (keyof NutrientTotals)[]) {
    result[k] = (per100g[k] ?? 0) * scale
  }
  return result
}

export default function FoodSearchBar({ onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [servingOverride, setServingOverride] = useState<Record<string, number>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search-food?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.foods ?? [])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  function handleAdd(result: SearchResult) {
    const servingG = servingOverride[result.fdcId] ?? result.defaultServingG
    const nutrients = result.nutrientsPer100g
      ? scaleNutrients(result.nutrientsPer100g, servingG)
      : emptyTotals()
    const macros = result.macrosPer100g
      ? scaleMacros(result.macrosPer100g, servingG)
      : emptyMacros()
    const calories = result.caloriesPer100g
      ? Math.round(result.caloriesPer100g * servingG / 100)
      : 0

    const food: FoodEntry = {
      fdcId: result.fdcId,
      name: result.name,
      servingSizeG: servingG,
      macros,
      nutrients,
      calories,
    }
    onAdd(food)
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl px-3 gap-2">
        {loading ? (
          <Loader2 size={16} className="text-stone-400 animate-spin shrink-0" />
        ) : (
          <Search size={16} className="text-stone-400 shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search foods (e.g. salmon, spinach)"
          className="flex-1 bg-transparent py-3 text-white placeholder-stone-500 text-sm focus:outline-none"
        />
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-800 border border-stone-700 rounded-xl overflow-hidden z-20 shadow-xl max-h-64 overflow-y-auto">
          {results.map(r => (
            <div key={r.fdcId} className="flex items-center gap-2 px-3 py-2.5 hover:bg-stone-700 transition-colors border-b border-stone-700/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{r.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    defaultValue={r.defaultServingG}
                    onChange={e => setServingOverride(prev => ({ ...prev, [r.fdcId]: Number(e.target.value) }))}
                    onClick={e => e.stopPropagation()}
                    className="w-16 bg-stone-700 rounded px-1.5 py-0.5 text-stone-300 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-stone-400 text-xs">g</span>
                  {r.caloriesPer100g > 0 && (
                    <span className="text-stone-400 text-xs">
                      · {Math.round(r.caloriesPer100g * (servingOverride[r.fdcId] ?? r.defaultServingG) / 100)} kcal
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAdd(r)}
                className="shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg p-1.5 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
