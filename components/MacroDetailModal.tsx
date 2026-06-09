'use client'

import { X } from 'lucide-react'
import { MACRO_META } from '@/lib/macros'
import type { MacroKey, MacroTotals } from '@/types'

interface FoodItem {
  name: string
  macros?: MacroTotals
  servingSizeG?: number
  meal_type?: string
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
}

// Which of today's logged foods provided a given macro, biggest contributor first.
export default function MacroDetailModal({
  macroKey, foods, onClose,
}: { macroKey: MacroKey; foods: FoodItem[]; onClose: () => void }) {
  const meta = MACRO_META[macroKey]

  const items = foods
    .map(f => ({
      name: f.name,
      amount: f.macros?.[macroKey] ?? 0,
      grams: f.servingSizeG ? Math.round(f.servingSizeG) : null,
      meal: f.meal_type,
    }))
    .filter(x => x.amount > 0.05)
    .sort((a, b) => b.amount - a.amount)

  const total = items.reduce((s, x) => s + x.amount, 0)
  const max = items.length ? items[0].amount : 0

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-stone-900 border border-stone-700 rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-2xl" aria-hidden="true">{meta.emoji}</span>
          <div className="flex-1">
            <p className="text-white font-bold leading-tight">{meta.label} today</p>
            <p className="text-stone-400 text-xs">{Math.round(total)}{meta.unit} from {items.length} food{items.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex items-center justify-center w-9 h-9 -mr-1 text-stone-400 hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8">
            None of today&apos;s logged foods have {meta.label.toLowerCase()} yet.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((x, i) => {
              const pct = total > 0 ? Math.round((x.amount / total) * 100) : 0
              const barW = max > 0 ? Math.max(4, Math.round((x.amount / max) * 100)) : 0
              return (
                <li key={i} className="bg-stone-800/60 rounded-xl px-3 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <p className="flex-1 min-w-0 text-stone-100 text-sm truncate">
                      {x.meal && <span className="mr-1" aria-hidden="true">{MEAL_EMOJI[x.meal] ?? ''}</span>}
                      {x.name}
                      {x.grams != null && <span className="text-stone-500"> · {x.grams}g</span>}
                    </p>
                    <span className="text-white text-sm font-semibold tabular-nums shrink-0">
                      {x.amount % 1 === 0 ? x.amount : x.amount.toFixed(1)}{meta.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${meta.color}`} style={{ width: `${barW}%` }} />
                    </div>
                    <span className="text-stone-400 text-[11px] tabular-nums w-9 text-right">{pct}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
