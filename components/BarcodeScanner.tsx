'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, ScanLine, Keyboard } from 'lucide-react'
import type { FoodEntry, NutrientTotals, MacroTotals } from '@/types'
import { emptyTotals, NUTRIENT_KEYS } from '@/lib/nutrients'
import { scaleMacros } from '@/lib/macros'

// Minimal typing for the native BarcodeDetector API (not in lib.dom yet)
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

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

export default function BarcodeScanner({ onAdd, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const handledRef = useRef(false)

  const [status, setStatus] = useState<'starting' | 'scanning' | 'looking-up' | 'error'>('starting')
  const [message, setMessage] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [cameraSupported, setCameraSupported] = useState(true)

  async function lookup(code: string) {
    if (handledRef.current) return
    handledRef.current = true
    stopCamera()
    setStatus('looking-up')
    setMessage(`Looking up ${code}…`)
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok || !data.food) {
        setStatus('error')
        setMessage(data.error === 'Product not found'
          ? `No product found for ${code}. Try manual search instead.`
          : 'Lookup failed. Try again.')
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
      setMessage('Lookup failed. Check your connection and try again.')
      handledRef.current = false
    }
  }

  function stopCamera() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false)
      setStatus('error')
      setMessage('Camera scanning isn’t supported on this browser — enter the barcode manually below.')
      return
    }

    let cancelled = false
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })

    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setStatus('scanning')
        setMessage('Point your camera at a barcode')

        const tick = async () => {
          if (cancelled || handledRef.current) return
          try {
            const codes = await detector.detect(video)
            if (codes.length > 0 && codes[0].rawValue) {
              await lookup(codes[0].rawValue)
              return
            }
          } catch { /* transient detect errors are fine */ }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } catch {
        if (cancelled) return
        setCameraSupported(false)
        setStatus('error')
        setMessage('Couldn’t access the camera. Enter the barcode manually below.')
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
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <div className="flex items-center gap-2 text-white">
          <ScanLine size={18} className="text-emerald-400" />
          <span className="font-semibold">Scan barcode</span>
        </div>
        <button onClick={() => { stopCamera(); onClose() }} aria-label="Close scanner" className="text-white/70 hover:text-white">
          <X size={24} />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {cameraSupported && status !== 'error' && (
          <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden bg-stone-900 border border-stone-700">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            {/* Scan frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-24 border-2 border-emerald-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {status === 'looking-up' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-400" size={28} />
              </div>
            )}
          </div>
        )}

        <p className="text-stone-300 text-sm mt-5 text-center min-h-[20px]">
          {status === 'starting' && 'Starting camera…'}
          {message}
        </p>

        {/* Manual entry */}
        <form onSubmit={submitManual} className="w-full max-w-sm mt-6">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-2">
            <Keyboard size={13} />
            <span>Or type the barcode number</span>
          </div>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 3017620422003"
              className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-3 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={manualCode.replace(/\D/g, '').length < 6 || status === 'looking-up'}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold px-4 rounded-xl text-sm transition-colors"
            >
              Look up
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
