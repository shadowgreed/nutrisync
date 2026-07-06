'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, ScanLine, Keyboard } from 'lucide-react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import type { FoodEntry, NutrientTotals, MacroTotals } from '@/types'
import { emptyTotals, NUTRIENT_KEYS } from '@/lib/nutrients'
import { scaleMacros } from '@/lib/macros'
import { useI18n } from '@/components/I18nProvider'

function scaleNutrients(per100g: NutrientTotals, servingG: number): NutrientTotals {
  const factor = servingG / 100
  const out = emptyTotals()
  for (const k of NUTRIENT_KEYS) out[k] = (per100g[k] ?? 0) * factor
  return out
}

interface ApiFood {
  fdcId: string
  name: string
  defaultServingG: number
  caloriesPer100g: number
  macrosPer100g: MacroTotals
  nutrientsPer100g: NutrientTotals
}

interface Props {
  onAdd: (food: FoodEntry) => void
  onClose: () => void
}

// Restrict to grocery barcode formats for faster, more reliable decoding.
const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128,
])

export default function BarcodeScanner({ onAdd, onClose }: Props) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const handledRef = useRef(false)

  const [status, setStatus] = useState<'starting' | 'scanning' | 'looking-up' | 'error'>('starting')
  const [message, setMessage] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [cameraOk, setCameraOk] = useState(true)

  function stopCamera() {
    try { controlsRef.current?.stop() } catch { /* noop */ }
    controlsRef.current = null
  }

  async function lookup(code: string) {
    if (handledRef.current) return
    handledRef.current = true
    stopCamera()
    setStatus('looking-up')
    setMessage(t.barcode.lookingUp(code))
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok || !data.food) {
        setStatus('error')
        setMessage(data.error === 'Product not found'
          ? t.barcode.notFound(code)
          : t.barcode.lookupFailed)
        handledRef.current = false
        return
      }
      const f = data.food as ApiFood
      const g = f.defaultServingG
      const food: FoodEntry = {
        fdcId: f.fdcId,
        name: f.name,
        servingSizeG: g,
        calories: Math.round((f.caloriesPer100g * g) / 100),
        macros: scaleMacros(f.macrosPer100g, g),
        nutrients: scaleNutrients(f.nutrientsPer100g, g),
      }
      onAdd(food)
      onClose()
    } catch {
      setStatus('error')
      setMessage(t.barcode.lookupFailedNetwork)
      handledRef.current = false
    }
  }

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraOk(false)
      setStatus('error')
      setMessage(t.barcode.noCamera)
      return
    }

    let cancelled = false
    const reader = new BrowserMultiFormatReader(hints)

    ;(async () => {
      try {
        const video = videoRef.current
        if (!video) return
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          video,
          (result) => {
            if (result && !handledRef.current) lookup(result.getText())
          },
        )
        if (cancelled) { controls.stop(); return }
        controlsRef.current = controls
        setStatus('scanning')
        setMessage(t.barcode.point)
      } catch {
        if (cancelled) return
        setCameraOk(false)
        setStatus('error')
        setMessage(t.barcode.cameraDenied)
      }
    })()

    return () => { cancelled = true; stopCamera() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.replace(/\D/g, '')
    if (code.length >= 6) lookup(code)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-safe pb-3">
        <div className="flex items-center gap-2 text-white">
          <ScanLine size={18} className="text-emerald-400" aria-hidden="true" />
          <span className="font-semibold">{t.barcode.title}</span>
        </div>
        <button onClick={() => { stopCamera(); onClose() }} aria-label={t.barcode.closeAria} className="flex items-center justify-center w-11 h-11 -mr-2 text-white/70 hover:text-white">
          <X size={24} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {cameraOk && status !== 'error' && (
          <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden bg-stone-900 border border-stone-700">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-24 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {status === 'looking-up' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-400" size={28} aria-hidden="true" />
              </div>
            )}
          </div>
        )}

        <p className="text-stone-300 text-sm mt-5 text-center min-h-[20px]">
          {status === 'starting' && t.barcode.starting}
          {message}
        </p>

        <form onSubmit={submitManual} className="w-full max-w-sm mt-6">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-2">
            <Keyboard size={13} aria-hidden="true" />
            <span>{t.barcode.orType}</span>
          </div>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              inputMode="numeric"
              placeholder={t.barcode.placeholder}
              aria-label={t.barcode.numberAria}
              className="flex-1 min-w-0 bg-stone-800 border border-stone-700 rounded-xl px-3 py-3 text-white text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={manualCode.replace(/\D/g, '').length < 6 || status === 'looking-up'}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm transition-colors"
            >
              {t.barcode.lookUp}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
