'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, PartyPopper, Sparkles } from 'lucide-react'
import { WEEKLY_SEEN_KEY, currentWeekKey } from '@/lib/weekly'
import type { WeeklyReport } from '@/lib/weekly'

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
  const slide = slides[i]
  const isLast = i === slides.length - 1

  // Mark this week's report as seen so the dashboard won't auto-open it again.
  useEffect(() => {
    try { localStorage.setItem(WEEKLY_SEEN_KEY, currentWeekKey()) } catch { /* ignore */ }
  }, [])

  function done() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-12 pb-2 flex items-center justify-between">
        <div>
          <p className="text-white font-bold">Your week in review</p>
          <p className="text-stone-400 text-xs">{report.weekLabel}</p>
        </div>
        <button onClick={done} aria-label="Close" className="flex items-center justify-center w-10 h-10 text-stone-400 hover:text-white">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="px-4 flex gap-1.5 mb-2">
        {slides.map((s, idx) => (
          <div key={s.key} className={`h-1 flex-1 rounded-full transition-colors ${idx <= i ? 'bg-emerald-500' : 'bg-stone-700'}`} />
        ))}
      </div>

      {/* Slide */}
      <button
        type="button"
        onClick={() => (isLast ? done() : setI(i + 1))}
        className={`flex-1 w-full text-left bg-gradient-to-b ${slide.accent} px-6 flex flex-col items-center justify-center gap-5`}
      >
        <span className="text-6xl" aria-hidden="true">{slide.emoji}</span>
        <p className="text-stone-300 text-sm font-medium">{slide.title}</p>

        <div className="text-center">
          <p className="text-white text-6xl font-extrabold tabular-nums leading-none">{slide.big}</p>
          <p className="text-stone-400 text-sm mt-2">{slide.sub}</p>
        </div>

        <p className="text-stone-400 text-xs">{slide.goalLine}</p>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
          slide.accomplished ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' : 'bg-stone-800 text-stone-200 border border-stone-700'
        }`}>
          {slide.accomplished
            ? <><PartyPopper size={15} aria-hidden="true" /> Goal accomplished!</>
            : <><Sparkles size={15} aria-hidden="true" /> Keep going</>}
        </div>

        <p className="text-stone-200 text-sm text-center max-w-xs leading-relaxed">{slide.message}</p>
      </button>

      {/* Nav */}
      <div className="px-4 py-5 flex items-center justify-between">
        <button
          onClick={() => setI(Math.max(0, i - 1))}
          disabled={i === 0}
          className="flex items-center gap-1 text-stone-400 hover:text-white disabled:opacity-0 transition-colors text-sm px-2 py-2"
        >
          <ChevronLeft size={18} aria-hidden="true" /> Back
        </button>
        <span className="text-stone-500 text-xs tabular-nums">{i + 1} / {slides.length}</span>
        <button
          onClick={() => (isLast ? done() : setI(i + 1))}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-4 py-2.5 transition-colors text-sm"
        >
          {isLast ? 'Done' : <>Next <ChevronRight size={18} aria-hidden="true" /></>}
        </button>
      </div>
    </div>
  )
}
