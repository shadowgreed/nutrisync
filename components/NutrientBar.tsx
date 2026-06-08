'use client'

import { NUTRIENT_META } from '@/lib/nutrients'
import type { NutrientKey } from '@/types'

const STATUS_COLORS = {
  red:    'bg-red-500',
  yellow: 'bg-yellow-400',
  green:  'bg-emerald-500',
}

const STATUS_BG = {
  red:    'bg-red-950/50 border-red-800/40',
  yellow: 'bg-yellow-950/50 border-yellow-700/40',
  green:  'bg-emerald-950/50 border-emerald-800/40',
}

// Text label so status isn't conveyed by colour alone (WCAG 1.4.1)
const STATUS_LABEL = {
  red:    { text: 'Low',     cls: 'text-red-300' },
  yellow: { text: 'Halfway', cls: 'text-yellow-300' },
  green:  { text: 'Hit ✓',   cls: 'text-emerald-300' },
}

interface Props {
  nutrientKey: NutrientKey
  value: number
  onClick?: () => void
  compact?: boolean
}

export default function NutrientBar({ nutrientKey, value, onClick, compact }: Props) {
  const meta = NUTRIENT_META[nutrientKey]
  const pct = Math.min(100, Math.round((value / meta.target) * 100))
  const status = pct >= 100 ? 'green' : pct >= 50 ? 'yellow' : 'red'
  const label = STATUS_LABEL[status]
  const valueStr = value % 1 === 0 ? String(value) : value.toFixed(1)
  const ariaLabel = `${meta.label}: ${valueStr} of ${meta.target} ${meta.unit}, ${pct} percent, ${label.text}`

  if (compact) {
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${STATUS_BG[status]} transition-transform active:scale-95 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className="text-lg" aria-hidden="true">{meta.emoji}</span>
        <div className="w-8 h-1.5 rounded-full bg-stone-700">
          <div className={`h-full rounded-full ${STATUS_COLORS[status]}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-stone-300 text-[11px] font-medium">{pct}%</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border ${STATUS_BG[status]} text-left transition-all hover:opacity-90 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className="text-xl w-7 text-center" aria-hidden="true">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-white text-sm font-medium truncate">{meta.label}</span>
          <span className="text-stone-300 text-xs ml-2 shrink-0 tabular-nums">
            {valueStr} / {meta.target} {meta.unit}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-700">
          <div
            className={`h-full rounded-full transition-all ${STATUS_COLORS[status]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={`text-xs shrink-0 font-medium w-14 text-right ${label.cls}`} aria-hidden="true">{label.text}</span>
    </button>
  )
}
