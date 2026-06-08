'use client'

import { X } from 'lucide-react'
import type { GapCorrection } from '@/types'

interface Props {
  gap: GapCorrection
  onClose: () => void
}

const STATUS_LABEL = { red: 'Low', yellow: 'Partial', green: 'Met' }
const STATUS_COLOR = {
  red:    'text-red-400 bg-red-950/60 border-red-700',
  yellow: 'text-yellow-300 bg-yellow-950/60 border-yellow-700',
  green:  'text-emerald-400 bg-emerald-950/60 border-emerald-700',
}

export default function NutrientGapPanel({ gap, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wider mb-0.5">Nutrient detail</p>
            <h2 className="text-white font-bold text-lg">{gap.label}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Status */}
        <div className="p-5 border-b border-stone-800">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${STATUS_COLOR[gap.status]}`}>
            {STATUS_LABEL[gap.status]} — {gap.pctMet}% of daily target
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-stone-400">Today</span>
            <span className="text-white font-medium">
              {gap.current % 1 === 0 ? gap.current : gap.current.toFixed(1)} {gap.unit}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-stone-400">Daily target</span>
            <span className="text-stone-300">{gap.target} {gap.unit}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-700">
            <div
              className={`h-full rounded-full transition-all ${gap.status === 'green' ? 'bg-emerald-500' : gap.status === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}
              style={{ width: `${gap.pctMet}%` }}
            />
          </div>
        </div>

        {/* Food fixes */}
        {gap.status !== 'green' && (
          <div className="p-5">
            <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">
              Foods that close this gap
            </p>
            <div className="space-y-2">
              {gap.fixes.map((fix, i) => (
                <div key={i} className="flex items-center justify-between bg-stone-800 rounded-xl p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{fix.name}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{fix.serving}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-emerald-400 font-bold text-sm">
                      +{Math.min(fix.pctGapClosed, 100)}%
                    </span>
                    <p className="text-stone-400 text-xs">of gap</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-stone-400 text-xs text-center mt-4">
              Values based on USDA FoodData Central
            </p>
          </div>
        )}

        {gap.status === 'green' && (
          <div className="p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-emerald-400 font-medium">You hit your {gap.label} target today!</p>
          </div>
        )}
      </div>
    </div>
  )
}
