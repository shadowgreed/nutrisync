'use client'

import { X } from 'lucide-react'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { useI18n } from '@/components/I18nProvider'
import type { GapCorrection } from '@/types'

interface Props {
  gap: GapCorrection
  onClose: () => void
}


const STATUS_COLOR = {
  red:    'text-red-400 bg-red-950/60 border-red-700',
  yellow: 'text-yellow-300 bg-yellow-950/60 border-yellow-700',
  green:  'text-emerald-400 bg-emerald-950/60 border-emerald-700',
}

export default function NutrientGapPanel({ gap, onClose }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>(onClose)
  const { t } = useI18n()
  const label = t.nutrients[gap.nutrient]
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.nutrientUi.detailAria(label)}
        tabIndex={-1}
        className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-wider mb-0.5">{t.nutrientUi.detail}</p>
            <h2 className="text-white font-bold text-lg">{label}</h2>
          </div>
          <button onClick={onClose} aria-label={t.common.close} className="flex items-center justify-center w-11 h-11 -mr-2 text-stone-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Status */}
        <div className="p-5 border-b border-stone-800">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${STATUS_COLOR[gap.status]}`}>
            {t.nutrientUi.statusPct(gap.status === 'red' ? t.nutrientUi.low : gap.status === 'yellow' ? t.nutrientUi.partial : t.nutrientUi.met, gap.pctMet)}
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-stone-400">{t.nutrientUi.today}</span>
            <span className="text-white font-medium">
              {gap.current % 1 === 0 ? gap.current : gap.current.toFixed(1)} {gap.unit}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-stone-400">{t.nutrientUi.dailyTarget}</span>
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
              {t.nutrientUi.foodsClose}
            </p>
            <div className="space-y-2">
              {gap.fixes.map((fix, i) => (
                <div key={i} className="flex items-center justify-between bg-stone-800 rounded-xl p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{t.foodFixes[fix.name]?.name ?? fix.name}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{t.foodFixes[fix.name]?.serving ?? fix.serving}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-emerald-400 font-bold text-sm">
                      +{Math.min(fix.pctGapClosed, 100)}%
                    </span>
                    <p className="text-stone-400 text-xs">{t.nutrientUi.ofGap}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-stone-400 text-xs text-center mt-4">
              {t.nutrientUi.usda}
            </p>
          </div>
        )}

        {gap.status === 'green' && (
          <div className="p-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-emerald-400 font-medium">{t.nutrientUi.hitTarget(label)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
