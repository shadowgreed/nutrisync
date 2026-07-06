'use client'

import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

/**
 * Tap-to-reveal definition bubble. Uses a real button (44px hit area) so it works
 * on touch — `title` tooltips only appear on desktop hover. Accessible: labelled,
 * dismissable, and the bubble is announced.
 */
export default function InfoTip({ label, text }: { label: string; text: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t.common.whatDoesMean(label)}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-11 h-11 -m-3 text-stone-400 hover:text-stone-200 transition-colors"
      >
        <Info size={14} aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 top-7 left-1/2 -translate-x-1/2 w-52 bg-stone-800 border border-stone-600 rounded-xl px-3 py-2 text-stone-200 text-xs leading-relaxed shadow-xl"
        >
          <span className="font-semibold text-white block mb-0.5">{label}</span>
          {text}
        </span>
      )}
    </span>
  )
}
