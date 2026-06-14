'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, PartyPopper, Sparkles } from 'lucide-react'
import { WEEKLY_SEEN_KEY, currentWeekKey } from '@/lib/weekly'
import type { WeeklyReport } from '@/lib/weekly'

const SLIDE_MS = 5000 // seconds per slide, auto-advance

interface Slide {
  key: string
  emoji: string
  title: string
  big: string
  sub: string
  goalLine: string
  accomplished: boolean
  message: string
  accent: string // tailwind gradient
}

function buildSlides(r: WeeklyReport): Slide[] {
  return [
    {
      key: 'nutrients',
      emoji: '🥦',
      title: 'Nutrients this week',
      big: `${r.nutrients.onTrack}/${r.nutrients.total}`,
      sub: 'nutrients on track',
      goalLine: `Goal: all ${r.nutrients.total} micronutrients at 100% of target`,
      accomplished: r.nutrients.accomplished,
      message: r.nutrients.message,
      accent: 'from-emerald-600/30 to-stone-900',
    },
    {
      key: 'calories',
      emoji: '🍽️',
      title: 'Calories this week',
      big: r.daysLogged ? r.calories.avgPerDay.toLocaleString() : '—',
      sub: r.daysLogged ? 'kcal/day average' : 'no meals logged',
      goalLine: `Goal: ${r.calories.target.toLocaleString()} kcal/day`,
      accomplished: r.calories.accomplished,
      message: r.calories.message,
      accent: 'from-amber-600/30 to-stone-900',
    },
    {
      key: 'activities',
      emoji: '🏃',
      title: 'Activity this week',
      big: `${r.activities.activeDays}/${r.activities.goalDays}`,
      sub: 'active days',
      goalLine: `Goal: ${r.activities.goalDays} active days · ${r.activities.caloriesBurned.toLocaleString()} kcal burned`,
      accomplished: r.activities.accomplished,
      message: r.activities.message,
      accent: 'from-orange-600/30 to-stone-900',
    },
  ]
}

export default function WeeklyReportClient({ report }: { report: WeeklyReport }) {
  const router = useRouter()
  const slides = buildSlides(report)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const slide = slides[i]
  const isLast = i === slides.length - 1

  // Mark this week's report as seen so the dashboard won't auto-open it again.
  useEffect(() => {
    try { localStorage.setItem(WEEKLY_SEEN_KEY, currentWeekKey()) } catch { /* ignore */ }
  }, [])

  function done() {
    router.push('/dashboard')
  }
  function next() { isLast ? done() : setI(p => p + 1) }
  function prev() { setI(p => Math.max(0, p - 1)) }

  // Story-style gestures: hold to pause, tap left/right to navigate, swipe down to close.
  function onDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    setPaused(true)
  }
  function onMove(e: React.PointerEvent) {
    const s = startRef.current
    if (!s) return
    const dy = e.clientY - s.y
    const dx = e.clientX - s.x
    if (dy > 0 && dy > Math.abs(dx)) { setDragging(true); setDragY(dy) }
  }
  function onUp(e: React.PointerEvent) {
    const s = startRef.current
    startRef.current = null
    setPaused(false)
    setDragging(false)
    if (!s) return
    const dy = e.clientY - s.y
    const dx = e.clientX - s.x
    const dt = Date.now() - s.t
    if (dy > 90) { done(); return }           // swipe down → close
    setDragY(0)
    if (dt < 250 && Math.abs(dy) < 12 && Math.abs(dx) < 12) {
      const w = typeof window !== 'undefined' ? window.innerWidth : 400
      if (e.clientX < w * 0.32) prev()        // tap left third → back
      else next()                             // tap elsewhere → forward
    }
  }
  function onCancel() {
    startRef.current = null
    setPaused(false)
    setDragging(false)
    setDragY(0)
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-stone-950 flex flex-col select-none bg-gradient-to-b ${slide.accent}`}
      style={{
        transform: `translateY(${dragY}px) scale(${1 - Math.min(dragY / 1600, 0.05)})`,
        opacity: 1 - Math.min(dragY / 500, 0.6),
        transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
      }}
    >
      {/* Progress segments */}
      <div className="px-3 pt-3 flex gap-1.5">
        {slides.map((s, idx) => (
          <div key={s.key} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
            <div
              key={idx === i ? `active-${i}` : `bar-${idx}`}
              className="h-full bg-white rounded-full"
              style={
                idx < i
                  ? { width: '100%' }
                  : idx === i
                    ? { width: '0%', animation: `story-progress ${SLIDE_MS}ms linear forwards`, animationPlayState: paused || dragging ? 'paused' : 'running' }
                    : { width: '0%' }
              }
              onAnimationEnd={idx === i ? next : undefined}
            />
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">Your week in review</p>
          <p className="text-stone-300 text-xs">{report.weekLabel}</p>
        </div>
        <button onClick={done} aria-label="Close" className="flex items-center justify-center w-10 h-10 text-stone-200 hover:text-white">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Slide (gesture surface) */}
      <div
        className="flex-1 w-full px-6 flex flex-col items-center justify-center gap-5"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <span className="text-6xl" aria-hidden="true">{slide.emoji}</span>
        <p className="text-stone-200 text-sm font-medium">{slide.title}</p>

        <div className="text-center">
          <p className="text-white text-6xl font-extrabold tabular-nums leading-none">{slide.big}</p>
          <p className="text-stone-300 text-sm mt-2">{slide.sub}</p>
        </div>

        <p className="text-stone-300 text-xs">{slide.goalLine}</p>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
          slide.accomplished ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' : 'bg-stone-800 text-stone-200 border border-stone-700'
        }`}>
          {slide.accomplished
            ? <><PartyPopper size={15} aria-hidden="true" /> Goal accomplished!</>
            : <><Sparkles size={15} aria-hidden="true" /> Keep going</>}
        </div>

        <p className="text-stone-100 text-sm text-center max-w-xs leading-relaxed">{slide.message}</p>
      </div>

      {/* Hint */}
      <p className="text-center text-stone-400 text-[11px] pb-6">Tap to skip · hold to pause · swipe down to close</p>
    </div>
  )
}
