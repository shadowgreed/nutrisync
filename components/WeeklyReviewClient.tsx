'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X, Share2, Download, Target } from 'lucide-react'
import { WEEKLY_SEEN_KEY, currentWeekKey } from '@/lib/weekly'
import { logReviewEvent } from '@/lib/weekly-review-track'
import type { WeeklyReview } from '@/lib/weekly-review'

const SLIDE_MS = 6000
const COUNT_MS = 800
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)

// ── Animated counter (0 → value on mount) ─────────────────────────────────────
function Counter({ value, suffix = '', duration = COUNT_MS }: { value: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setN(value * easeOut(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className="tabular-nums">{Math.round(n).toLocaleString()}{suffix}</span>
}

// ── Animated progress ring ────────────────────────────────────────────────────
function Ring({ pct, label }: { pct: number; label: ReactNode }) {
  const size = 200, stroke = 16
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(circ * (1 - Math.max(0, Math.min(100, pct)) / 100)))
    return () => cancelAnimationFrame(id)
  }, [circ, pct])
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: `stroke-dashoffset ${COUNT_MS}ms ease` }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{label}</div>
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = requestAnimationFrame(() => setW(Math.max(3, Math.min(100, pct)))); return () => cancelAnimationFrame(id) }, [pct])
  return (
    <div className="h-2 rounded-full bg-white/15 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%`, transition: `width ${COUNT_MS}ms ease` }} />
    </div>
  )
}

interface SlideDef { key: string; theme: string; node: ReactNode }

const MEAL_LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }

export default function WeeklyReviewClient({ review, name }: { review: WeeklyReview; name: string }) {
  const router = useRouter()
  const weekKey = useMemo(() => currentWeekKey(), [])

  const slides = useMemo<SlideDef[]>(() => buildSlides(review, name), [review, name])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const endedRef = useRef(false)
  const slide = slides[i]
  const isLast = i === slides.length - 1

  // Open / seen
  useEffect(() => {
    logReviewEvent('weekly_review_opened', { weekKey })
    try { localStorage.setItem(WEEKLY_SEEN_KEY, currentWeekKey()) } catch { /* ignore */ }
  }, [weekKey])

  // Per-slide analytics + completion + haptics
  useEffect(() => {
    logReviewEvent('weekly_review_slide_viewed', { slide: slide.key, weekKey })
    if (slide.key === 'group') logReviewEvent('weekly_review_group_comparison_viewed', { weekKey })
    if (slide.key === 'streak' && review.streak > 0) { try { navigator.vibrate?.(60) } catch { /* ignore */ } }
    if (isLast && !endedRef.current) { endedRef.current = true; logReviewEvent('weekly_review_completed', { weekKey }) }
  }, [i, slide.key, isLast, weekKey, review.streak])

  function close(reason: 'dismissed' | 'done') {
    if (reason === 'dismissed') logReviewEvent('weekly_review_dismissed', { slide: slide.key, weekKey })
    router.push('/dashboard')
  }
  function next() { if (isLast) close('done'); else setI(p => p + 1) }
  function prev() { setI(p => Math.max(0, p - 1)) }

  // Story gestures: hold to pause, tap left/right, swipe down to dismiss.
  function onDown(e: React.PointerEvent) { startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }; setPaused(true) }
  function onMove(e: React.PointerEvent) {
    const s = startRef.current; if (!s) return
    const dy = e.clientY - s.y, dx = e.clientX - s.x
    if (dy > 0 && dy > Math.abs(dx)) { setDragging(true); setDragY(dy) }
  }
  function onUp(e: React.PointerEvent) {
    const s = startRef.current; startRef.current = null; setPaused(false); setDragging(false)
    if (!s) return
    const dy = e.clientY - s.y, dx = e.clientX - s.x, dt = Date.now() - s.t
    if (dy > 90) { close('dismissed'); return }
    setDragY(0)
    if (dt < 250 && Math.abs(dy) < 12 && Math.abs(dx) < 12) {
      const w = typeof window !== 'undefined' ? window.innerWidth : 400
      if (e.clientX < w * 0.32) prev(); else next()
    } else if (dt >= 250 && Math.abs(dx) < 24) {
      // A genuine hold-to-pause (not a tap, not a swipe).
      logReviewEvent('weekly_review_paused', { slide: slide.key, weekKey })
    }
  }
  function onCancel() { startRef.current = null; setPaused(false); setDragging(false); setDragY(0) }

  // Auto-advance everywhere except the final (share) slide.
  const autoAdvance = !isLast

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col select-none bg-gradient-to-b ${slide.theme}`}
      style={{
        transform: `translateY(${dragY}px) scale(${1 - Math.min(dragY / 1600, 0.05)})`,
        opacity: 1 - Math.min(dragY / 500, 0.6),
        transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
      }}
    >
      {/* Progress segments */}
      <div className="px-3 pt-3 flex gap-1">
        {slides.map((s, idx) => (
          <div key={s.key} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
            <div
              key={idx === i ? `active-${i}` : `bar-${idx}`}
              className="h-full bg-white rounded-full"
              style={
                idx < i ? { width: '100%' }
                  : idx === i && autoAdvance
                    ? { width: '0%', animation: `story-progress ${SLIDE_MS}ms linear forwards`, animationPlayState: paused || dragging ? 'paused' : 'running' }
                    : idx === i ? { width: '100%' } : { width: '0%' }
              }
              onAnimationEnd={idx === i && autoAdvance ? next : undefined}
            />
          </div>
        ))}
      </div>

      {/* Top bar with explicit slide indicator */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">Your Week in Review</p>
          <p className="text-white/60 text-xs">{review.weekLabel} · Slide {i + 1} of {slides.length}</p>
        </div>
        <button onClick={() => close('dismissed')} aria-label="Close" className="flex items-center justify-center w-10 h-10 text-white/80 hover:text-white">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Slide surface — only the current slide is mounted, so counters animate on entry */}
      <div
        className="flex-1 w-full px-6 flex flex-col items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
      >
        <div key={slide.key} className="w-full max-w-sm flex flex-col items-center justify-center text-center animate-[wr-in_0.4s_ease]">
          {slide.node}
        </div>
      </div>

      {!isLast && <p className="text-center text-white/45 text-[11px] pb-6">Tap to continue · hold to pause · swipe down to close</p>}

      <style>{`@keyframes wr-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}

// ── Slide construction ────────────────────────────────────────────────────────
function buildSlides(r: WeeklyReview, name: string): SlideDef[] {
  const slides: SlideDef[] = []

  // 1 — Cover
  slides.push({
    key: 'cover', theme: 'from-zinc-700/50 via-stone-900 to-stone-950',
    node: (
      <>
        <p className="text-5xl mb-3" aria-hidden="true">📖</p>
        <h2 className="text-white text-3xl font-extrabold leading-tight">Your Week<br />in Review</h2>
        <p className="text-white/60 text-sm mt-2">{r.weekLabel}</p>
        <div className="grid grid-cols-3 gap-3 mt-8 w-full">
          <CoverStat value={r.cover.mealsLogged} label="meals" />
          <CoverStat value={r.cover.workouts} label="workouts" />
          <CoverStat value={r.cover.hydrationDays} label="hydration days" />
        </div>
        <p className="text-white/50 text-xs mt-8">Tap to begin →</p>
      </>
    ),
  })

  // 2 — Consistency score
  slides.push({
    key: 'consistency', theme: 'from-amber-600/40 via-stone-900 to-stone-950',
    node: (
      <>
        <p className="text-white/80 text-sm font-medium mb-5">Consistency Score</p>
        <Ring pct={r.consistency.score} label={<span className="text-white text-5xl font-extrabold"><Counter value={r.consistency.score} suffix="%" /></span>} />
        <div className="w-full mt-7 space-y-2.5">
          {r.consistency.breakdown.map(b => (
            <div key={b.label}>
              <div className="flex justify-between text-xs text-white/70 mb-1"><span>{b.label}</span><span className="tabular-nums">{b.pct}%</span></div>
              <Bar pct={b.pct} color="bg-gradient-to-r from-amber-400 to-amber-500" />
            </div>
          ))}
        </div>
      </>
    ),
  })

  // 3 — Best day
  if (r.bestDay) {
    const bd = r.bestDay
    slides.push({
      key: 'best-day', theme: 'from-emerald-600/40 via-stone-900 to-stone-950',
      node: (
        <>
          <p className="text-white/80 text-sm font-medium">Your Best Day</p>
          <p className="text-white text-5xl font-extrabold mt-3">{bd.weekday}</p>
          <div className="mt-6 bg-white/10 border border-white/15 rounded-2xl px-5 py-4 w-full space-y-2">
            <p className="text-emerald-300 text-2xl font-bold"><Counter value={bd.nutrientsHit} />/{bd.nutrientsTotal} <span className="text-base font-medium text-white/70">nutrients hit</span></p>
            <div className="flex justify-center gap-2 pt-1">
              <span className={`text-xs px-2.5 py-1 rounded-full ${bd.active ? 'bg-orange-900/60 text-orange-200' : 'bg-white/10 text-white/40'}`}>🏃 {bd.active ? 'Active' : 'Rest day'}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full ${bd.hydrated ? 'bg-sky-900/60 text-sky-200' : 'bg-white/10 text-white/40'}`}>💧 {bd.hydrated ? 'Hydrated' : 'Low water'}</span>
            </div>
          </div>
        </>
      ),
    })
  }

  // 4 — Nutrient champion
  if (r.nutrients.champion) {
    const champ = r.nutrients.champion
    slides.push({
      key: 'nutrients', theme: 'from-emerald-600/40 via-stone-900 to-stone-950',
      node: (
        <>
          <p className="text-white/80 text-sm font-medium">Nutrient Champion</p>
          <p className="text-6xl mt-4" aria-hidden="true">{champ.emoji}</p>
          <p className="text-white text-2xl font-extrabold mt-2">{champ.label}</p>
          <p className="text-emerald-300 text-4xl font-extrabold mt-1"><Counter value={champ.pct} suffix="%" /></p>
          <p className="text-white/60 text-xs">of your daily target</p>
          {r.nutrients.lowest && (
            <p className="text-white/50 text-xs mt-6">Needs love next week: <span className="text-white/80">{r.nutrients.lowest.emoji} {r.nutrients.lowest.label}</span> at {r.nutrients.lowest.pct}%</p>
          )}
        </>
      ),
    })
  }

  // 5 — Streak
  if (r.streak > 0) {
    slides.push({
      key: 'streak', theme: 'from-orange-600/50 via-red-900/30 to-stone-950',
      node: (
        <>
          <p className="text-7xl mb-2 animate-pulse" aria-hidden="true">🔥</p>
          <p className="text-white text-6xl font-extrabold"><Counter value={r.streak} /></p>
          <p className="text-white/80 text-lg font-semibold mt-1">day logging streak</p>
          <p className="text-white/60 text-sm mt-5 max-w-xs">Consistency is your superpower. Keep the flame alive into next week!</p>
        </>
      ),
    })
  }

  // 6 — Activity story
  slides.push({
    key: 'activity', theme: 'from-orange-600/40 via-stone-900 to-stone-950',
    node: (
      <>
        <p className="text-white/80 text-sm font-medium">Activity Story</p>
        <p className="text-white text-6xl font-extrabold mt-3"><Counter value={r.activity.activeDays} /><span className="text-2xl text-white/60">/{r.activity.goalDays}</span></p>
        <p className="text-white/70 text-sm">active days</p>
        <p className="text-orange-300 text-3xl font-bold mt-5"><Counter value={r.activity.caloriesBurned} /> <span className="text-base font-medium text-white/70">kcal burned</span></p>
        {r.activity.caloriesBurned > 0 && (
          <div className="mt-6 text-white/70 text-sm space-y-1">
            <p className="text-white/50 text-xs uppercase tracking-wide">Equivalent to</p>
            <p>🚶 ~{r.activity.milesWalked} miles walked</p>
            <p>🍔 {r.activity.cheeseburgers} cheeseburgers burned</p>
          </div>
        )}
      </>
    ),
  })

  // 7 — Food MVP
  if (r.foodMvp) {
    const mvp = r.foodMvp
    slides.push({
      key: 'food-mvp', theme: 'from-teal-600/40 via-stone-900 to-stone-950',
      node: (
        <>
          <p className="text-white/80 text-sm font-medium">Your Food MVP</p>
          <p className="text-7xl mt-4" aria-hidden="true">{mvp.emoji}</p>
          <p className="text-white text-3xl font-extrabold mt-2 capitalize">{mvp.name}</p>
          <p className="text-teal-300 text-lg font-semibold mt-1">Logged <Counter value={mvp.count} /> times</p>
          {mvp.favoriteMealType && <p className="text-white/55 text-xs mt-5">Favorite meal: {MEAL_LABEL[mvp.favoriteMealType] ?? mvp.favoriteMealType}</p>}
        </>
      ),
    })
  }

  // 8 — Goal progress
  slides.push({
    key: 'goal', theme: 'from-purple-600/40 via-stone-900 to-stone-950',
    node: (
      <>
        <p className="text-white/80 text-sm font-medium flex items-center gap-1.5"><Target size={14} aria-hidden="true" /> {r.goal.label}</p>
        <p className="text-white text-4xl font-extrabold mt-4">{r.goal.headline}</p>
        <p className="text-purple-200 text-sm mt-1">{r.goal.sub}</p>
        {r.goal.pct != null && (
          <div className="w-full mt-6">
            <Bar pct={r.goal.pct} color="bg-gradient-to-r from-purple-400 to-fuchsia-500" />
            <p className="text-white/60 text-xs mt-1.5 text-right tabular-nums">{r.goal.pct}%</p>
          </div>
        )}
      </>
    ),
  })

  // 9 — Group performance
  if (r.group) {
    const g = r.group
    slides.push({
      key: 'group', theme: 'from-sky-600/40 via-stone-900 to-stone-950',
      node: (
        <>
          <p className="text-white/80 text-sm font-medium">Group Rank</p>
          <p className="text-white text-6xl font-extrabold mt-3">#{g.rank}<span className="text-2xl text-white/60"> of {g.total}</span></p>
          <div className="mt-6 w-full space-y-2">
            {g.highlights.map(h => (
              <div key={h.label} className="bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-left">
                <p className="text-white/50 text-[11px] uppercase tracking-wide">{h.label}</p>
                <p className="text-white text-sm font-medium">{h.value}</p>
              </div>
            ))}
          </div>
        </>
      ),
    })
  }

  // 10 — Next week mission
  slides.push({
    key: 'mission', theme: 'from-indigo-600/40 via-stone-900 to-stone-950',
    node: <MissionSlide mission={r.mission} />,
  })

  // Final — Share card
  slides.push({
    key: 'share', theme: 'from-emerald-700/40 via-purple-900/30 to-stone-950',
    node: <ShareSlide review={r} name={name} />,
  })

  return slides
}

function CoverStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-2xl py-3">
      <p className="text-white text-2xl font-extrabold"><Counter value={value} /></p>
      <p className="text-white/60 text-[11px] mt-0.5">{label}</p>
    </div>
  )
}

function MissionSlide({ mission }: { mission: WeeklyReview['mission'] }) {
  const router = useRouter()
  const weekKey = useMemo(() => currentWeekKey(), [])
  function accept() { logReviewEvent('weekly_review_mission_accepted', { weekKey }); router.push('/dashboard') }
  return (
    <>
      <p className="text-5xl mb-2" aria-hidden="true">🎯</p>
      <p className="text-white/80 text-sm font-medium">Next Week’s Mission</p>
      <p className="text-white text-3xl font-extrabold mt-2">{mission.title}</p>
      {mission.expectedImprovementPct != null && (
        <p className="text-indigo-200 text-sm mt-1">Expected improvement: <span className="font-bold">+{mission.expectedImprovementPct}%</span></p>
      )}
      <div className="mt-6 w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-left">
        <p className="text-white/50 text-[11px] uppercase tracking-wide mb-1.5">Try these</p>
        <ul className="space-y-1">
          {mission.foods.map((f, idx) => <li key={idx} className="text-white text-sm flex items-center gap-2"><span className="text-indigo-300">•</span>{f}</li>)}
        </ul>
      </div>
      <button onClick={accept} className="mt-6 w-full bg-white text-stone-900 font-bold py-3 rounded-xl text-sm hover:bg-white/90 transition-colors">
        Accept mission
      </button>
    </>
  )
}

function ShareSlide({ review, name }: { review: WeeklyReview; name: string }) {
  const [busy, setBusy] = useState(false)
  const s = review.share
  const lines = [
    `🔥 ${s.streak} day streak`,
    `🥦 ${s.nutrientsOnTrack} nutrients on track`,
    `🏃 ${s.activeDays} active days`,
    `💧 ${s.hydrationDays}/${s.hydrationGoalDays} hydration days`,
  ]

  async function makeImage(): Promise<Blob | null> {
    const W = 1080, H = 1350
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#064e3b'); g.addColorStop(0.55, '#1e1b4b'); g.addColorStop(1, '#0c0a09')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 40px system-ui, sans-serif'
    ctx.fillText('NUTRISYNC · WEEK IN REVIEW', W / 2, 150)
    ctx.fillStyle = '#ffffff'; ctx.font = '800 88px system-ui, sans-serif'
    ctx.fillText(`${name.split(/\s+/)[0]}’s Week`, W / 2, 280)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 38px system-ui, sans-serif'
    ctx.fillText(review.weekLabel, W / 2, 345)
    ctx.font = '700 62px system-ui, sans-serif'; ctx.fillStyle = '#ffffff'
    lines.forEach((ln, idx) => ctx.fillText(ln, W / 2, 560 + idx * 130))
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 34px system-ui, sans-serif'
    ctx.fillText('Eat well, together.', W / 2, H - 90)
    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'))
  }

  async function share() {
    setBusy(true)
    try {
      const blob = await makeImage()
      const file = blob ? new File([blob], 'nutrisync-week.png', { type: 'image/png' }) : null
      const text = `My NutriSync week:\n${lines.join('\n')}`
      const nav = navigator as Navigator & { canShare?: (d?: unknown) => boolean }
      if (file && nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], text })
      } else if (navigator.share) {
        await navigator.share({ text })
      } else if (blob) {
        download(blob)
      }
      logReviewEvent('weekly_review_shared', { weekKey: currentWeekKey() })
    } catch { /* user cancelled */ } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true)
    try { const blob = await makeImage(); if (blob) { download(blob); logReviewEvent('weekly_review_shared', { weekKey: currentWeekKey() }) } }
    finally { setBusy(false) }
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'nutrisync-week.png'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <p className="text-white/80 text-sm font-medium mb-3">That’s a wrap!</p>
      {/* Branded preview card */}
      <div className="w-full rounded-3xl p-5 bg-gradient-to-br from-emerald-700/60 via-indigo-900/60 to-stone-950 border border-white/15 shadow-xl">
        <p className="text-white/60 text-[10px] tracking-widest font-semibold">NUTRISYNC · WEEK IN REVIEW</p>
        <p className="text-white text-2xl font-extrabold mt-1">{name.split(/\s+/)[0]}’s Week</p>
        <p className="text-white/50 text-xs">{review.weekLabel}</p>
        <div className="mt-4 space-y-1.5 text-left">
          {lines.map((ln, idx) => <p key={idx} className="text-white text-lg font-semibold">{ln}</p>)}
        </div>
      </div>
      <div className="flex gap-2 mt-5 w-full">
        <button onClick={share} disabled={busy} className="flex-1 flex items-center justify-center gap-1.5 bg-white text-stone-900 font-bold py-3 rounded-xl text-sm hover:bg-white/90 transition-colors disabled:opacity-60">
          <Share2 size={15} aria-hidden="true" /> Share
        </button>
        <button onClick={save} disabled={busy} className="flex items-center justify-center gap-1.5 bg-white/15 text-white font-semibold py-3 px-4 rounded-xl text-sm hover:bg-white/25 transition-colors disabled:opacity-60">
          <Download size={15} aria-hidden="true" /> Save
        </button>
      </div>
    </>
  )
}
