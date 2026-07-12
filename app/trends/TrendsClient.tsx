'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Scale, TrendingUp, Plus, Utensils, Flame, Droplets, Sparkles, ChevronRight } from 'lucide-react'
import { BottomNav } from '../dashboard/DashboardClient'
import LogFab from '@/components/LogFab'
import Segmented from '@/components/Segmented'
import { summarize, microConsistency, type DayTotal } from '@/lib/trends'
import { MACRO_KEYS, MACRO_META } from '@/lib/macros'
import { kgToLbs, lbsToKg } from '@/lib/fitness'
import { mlToOz } from '@/lib/water'
import { userDayKey, isSunday } from '@/lib/day'
import { useI18n } from '@/components/I18nProvider'
import type { MacroTargets } from '@/types'

interface WeightLog { weight_kg: number; logged_at: string }
interface ActivityLog { logged_at: string; calories_burned: number }
interface WaterLog { logged_at: string; amount_ml: number }

interface Props {
  series30: DayTotal[]
  calorieTarget: number | null
  macroTargets: MacroTargets
  weightLogs: WeightLog[]
  activities: ActivityLog[]
  waterLogs: WaterLog[]
  waterTargetMl: number
  currentWeightKg: number | null
  targetWeightKg: number | null
  timeZone: string
}

export default function TrendsClient({ series30, calorieTarget, macroTargets, weightLogs, activities, waterLogs, waterTargetMl, currentWeightKg, targetWeightKg, timeZone }: Props) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const tr = t.trends
  const dateLocale = locale === 'es' ? 'es-419' : 'en-US'
  const [range, setRange] = useState<7 | 14 | 30>(7)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightError, setWeightError] = useState('')
  const weightInputRef = useRef<HTMLInputElement>(null)

  // Deep link from the quick-log FAB (/trends?log=weight): scroll to the weight
  // card, highlight it and focus the input so the coach/user can log right away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('log') !== 'weight') return
    const el = document.getElementById('weight-card')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-violet-500')
    const t = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-violet-500')
      weightInputRef.current?.focus()
    }, 600)
    return () => clearTimeout(t)
  }, [])

  const series = series30.slice(-range)
  const summary = summarize(series)
  const micros = microConsistency(series)

  const maxCal = Math.max(calorieTarget ?? 0, ...series.map(d => d.calories), 1)
  const targetPct = calorieTarget ? (calorieTarget / maxCal) * 100 : null

  // Calorie delta vs the previous equal-length window (only when we have the
  // history for it — i.e. the 7-day view, where days -14..-7 exist).
  const prevSeries = range === 7 ? series30.slice(-14, -7) : []
  const prevSummary = prevSeries.length ? summarize(prevSeries) : null
  const calorieDelta = (prevSummary && prevSummary.avgCalories > 0 && summary.avgCalories > 0)
    ? summary.avgCalories - prevSummary.avgCalories
    : null

  // Scope the weight chart to the selected range (it used to always show all).
  const rangeFloor = Date.now() - range * 86400000
  const weightInRange = weightLogs.filter(w => new Date(w.logged_at).getTime() >= rangeFloor)
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })

  async function logWeight(e: React.FormEvent) {
    e.preventDefault()
    const lbs = Number(weightInput)
    if (!Number.isFinite(lbs) || lbs <= 0) return
    setSavingWeight(true)
    setWeightError('')
    try {
      const res = await fetch('/api/log-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: lbsToKg(lbs) }), // input is lbs; DB stores kg
      })
      const data = await res.json()
      if (!res.ok) { setWeightError(data.error ?? tr.saveFailed); return }
      setWeightInput('')
      router.refresh()
    } finally {
      setSavingWeight(false)
    }
  }

  // Weight chart geometry — scoped to the selected range
  const W = 320, H = 110, pad = 10
  const cVals = weightInRange.map(w => w.weight_kg)
  const minW = cVals.length ? Math.min(...cVals) : 0
  const maxW = cVals.length ? Math.max(...cVals) : 0
  const span = maxW - minW || 1
  const pts = weightInRange.map((w, i) => {
    const x = pad + (weightInRange.length === 1 ? 0.5 : i / (weightInRange.length - 1)) * (W - 2 * pad)
    const y = pad + (1 - (w.weight_kg - minW) / span) * (H - 2 * pad)
    return { x, y, w: w.weight_kg }
  })
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const weightDelta = cVals.length >= 2 ? cVals[cVals.length - 1] - cVals[0] : 0

  // ── Goal-weight progress (in 25% milestones) — uses full history, not range ──
  const allVals = weightLogs.map(w => w.weight_kg)
  const startKg = allVals.length ? allVals[0] : currentWeightKg
  const nowKg = allVals.length ? allVals[allVals.length - 1] : currentWeightKg
  let goal: null | { pct: number; remainingLbs: number; milestone: number; reached: boolean; targetLbs: number } = null
  if (targetWeightKg != null && startKg != null && nowKg != null && Math.abs(startKg - targetWeightKg) > 0.05) {
    const total = Math.abs(startKg - targetWeightKg)
    const progressed = startKg > targetWeightKg ? startKg - nowKg : nowKg - startKg // signed toward goal
    const pct = Math.max(0, Math.min(100, Math.round((progressed / total) * 100)))
    const milestone = Math.floor(pct / 25) * 25 // 0,25,50,75,100
    goal = {
      pct,
      remainingLbs: Math.abs(kgToLbs(nowKg) - kgToLbs(targetWeightKg)),
      milestone,
      reached: pct >= 100,
      targetLbs: kgToLbs(targetWeightKg),
    }
  }
  const MILESTONE_MSG: Record<number, string> = {
    0: tr.milestone0,
    25: tr.milestone25,
    50: tr.milestone50,
    75: tr.milestone75,
    100: tr.milestone100,
  }

  // ── Calorie balance: burned + net over the range (in = avg per logged day) ──
  const rangeStartDay = series[0]?.date ?? ''
  const burnedInRange = activities
    .filter(a => userDayKey(a.logged_at, timeZone) >= rangeStartDay)
    .reduce((s, a) => s + (a.calories_burned || 0), 0)
  const avgBurned = summary.loggedDays ? Math.round(burnedInRange / summary.loggedDays) : 0
  const avgNet = (summary.avgCalories || 0) - avgBurned

  // ── Hydration over the range (oz/day vs target) ──
  const waterByDay = new Map<string, number>()
  for (const w of waterLogs) {
    const day = userDayKey(w.logged_at, timeZone)
    waterByDay.set(day, (waterByDay.get(day) ?? 0) + (w.amount_ml || 0))
  }
  const waterTargetOz = mlToOz(waterTargetMl || 2500)
  const waterChart = series.map(d => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'short' }),
    oz: mlToOz(waterByDay.get(d.date) ?? 0),
  }))
  const maxWaterOz = Math.max(...waterChart.map(d => d.oz), waterTargetOz, 1)
  const waterLoggedDays = waterChart.filter(d => d.oz > 0).length
  const waterDaysHit = waterChart.filter(d => d.oz >= waterTargetOz).length
  const avgWaterOz = waterLoggedDays ? Math.round(waterChart.reduce((s, d) => s + d.oz, 0) / waterLoggedDays) : 0

  // The weekly review unlocks only on Sunday (in the user's timezone).
  const weeklyUnlocked = isSunday(timeZone)

  return (
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-4 pt-safe pb-4 flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm">{tr.yourProgress}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{tr.title}</h1>
        </div>
        {/* Range toggle */}
        <Segmented
          options={([7, 14, 30] as const).map(r => ({ value: String(r), label: r === 30 ? tr.rangeMonth : tr.rangeDays(r) }))}
          value={String(range)}
          onChange={v => setRange(Number(v) as 7 | 14 | 30)}
          ariaLabel={tr.rangeSelectorAria}
        />
      </div>

      {/* Insight summary — the "am I on track?" answer in one line */}
      <div className="mx-4 mb-4 bg-gradient-to-br from-emerald-950/40 to-stone-900 border border-emerald-900/40 rounded-2xl px-4 py-3">
        {summary.loggedDays === 0 ? (
          <p className="text-stone-300 text-sm">{tr.emptyInsight}</p>
        ) : (
          <p className="text-stone-200 text-sm leading-relaxed">
            <span className="font-semibold text-white">{range === 7 ? tr.thisWeek : tr.lastNDays(range)}:</span>{' '}
            {tr.youAveraged}<span className="font-semibold text-white">{tr.kcalPerDay(summary.avgCalories.toLocaleString(dateLocale))}</span>
            {calorieDelta != null && calorieDelta !== 0 && (
              <span className="text-stone-400">{tr.vsLastWeek(calorieDelta < 0 ? '↓' : '↑', Math.abs(calorieDelta).toLocaleString(dateLocale))}</span>
            )}
            {tr.loggedConnector}<span className="font-semibold text-white">{tr.daysOfRange(summary.loggedDays, range)}</span>
            {weightInRange.length >= 2 && (
              <>{tr.weightConnector}<span className="font-semibold text-white">{tr.weightChange(weightDelta <= 0 ? tr.down : tr.up, Math.abs(weightDelta * 2.20462).toFixed(1))}</span></>
            )}
            .
          </p>
        )}
      </div>

      {/* Weekly recap entry point — unlocks on Sundays only */}
      {weeklyUnlocked ? (
        <Link href="/weekly" className="mx-4 mb-4 flex items-center gap-3 bg-gradient-to-br from-purple-900/40 to-stone-900 border border-purple-800/40 rounded-2xl px-4 py-3 hover:border-purple-700/60 transition-colors">
          <Sparkles size={18} className="text-purple-300 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-sm font-semibold">{tr.weekInReview}</h2>
            <p className="text-stone-400 text-xs">{tr.recapReady}</p>
          </div>
          <ChevronRight size={16} className="text-stone-500 shrink-0" aria-hidden="true" />
        </Link>
      ) : (
        <div className="mx-4 mb-4 flex items-center gap-3 bg-stone-900/60 border border-stone-800 rounded-2xl px-4 py-3 opacity-70" aria-disabled="true">
          <Sparkles size={18} className="text-stone-500 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h2 className="text-stone-300 text-sm font-semibold">{tr.weekInReview}</h2>
            <p className="text-stone-500 text-xs">{tr.unlocksSunday}</p>
          </div>
        </div>
      )}

      {/* Calorie balance — avg in / burned / net over the selected range */}
      <div className="mx-4 mb-4 grid grid-cols-3 gap-3">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
          <Utensils size={16} className="text-emerald-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-white font-bold text-lg tabular-nums">{summary.avgCalories || '—'}</p>
          <p className="text-stone-400 text-xs">{tr.avgKcalDay}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
          <Flame size={16} className="text-orange-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-white font-bold text-lg tabular-nums">{avgBurned}</p>
          <p className="text-stone-400 text-xs">{tr.burnedDay}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
          <TrendingUp size={16} className="text-sky-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-white font-bold text-lg tabular-nums">{avgNet > 0 ? '+' : ''}{avgNet}</p>
          <p className="text-stone-400 text-xs">{tr.netDay}</p>
        </div>
      </div>

      {/* Calorie bar chart */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h2 className="text-white font-semibold text-sm mb-3">{tr.caloriesLogged}</h2>
        <div className="relative h-32 flex items-end gap-1">
          {targetPct != null && (
            <div className="absolute left-0 right-0 border-t border-dashed border-emerald-500/50 z-10" style={{ bottom: `${targetPct}%` }}>
              <span className="absolute -top-2 right-0 text-xs text-emerald-500/80 bg-stone-900 px-1">{tr.target}</span>
            </div>
          )}
          {series.map((d, i) => {
            const h = (d.calories / maxCal) * 100
            const over = calorieTarget != null && d.calories > calorieTarget
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={d.calories === 0 ? tr.notLoggedTip(d.label) : tr.kcalTip(d.label, d.calories)}>
                {/* Value label above the bar (7-day view only — 30-day is too dense) */}
                {range === 7 && d.calories > 0 && (
                  <span className="text-xs text-stone-300 mb-0.5 tabular-nums leading-none">{d.calories}</span>
                )}
                {d.calories === 0 ? (
                  /* Hollow bar = not logged (vs a real low-calorie day) */
                  <div className="w-full rounded-t border border-dashed border-stone-600/80" style={{ height: '10%' }} />
                ) : (
                  <div
                    className={`w-full rounded-t ${over ? 'bg-red-500/70' : 'bg-emerald-500/70'}`}
                    style={{ height: `${Math.max(4, h)}%` }}
                  />
                )}
              </div>
            )
          })}
        </div>
        {range === 7 && (
          <div className="flex gap-1 mt-1.5">
            {series.map((d, i) => (
              <span key={i} className="flex-1 text-center text-xs text-stone-400 truncate">
                {new Date(d.date + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'short' })}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hydration */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets size={15} className="text-sky-400" />
            <h2 className="text-white font-semibold text-sm">{tr.hydration}</h2>
          </div>
          {waterLoggedDays > 0 && (
            <span className="text-stone-400 text-xs">{tr.daysOnTarget(waterDaysHit, range)}</span>
          )}
        </div>
        <div className="relative flex items-end gap-1 h-24">
          <div
            className="absolute left-0 right-0 border-t border-dashed border-sky-500/50"
            style={{ bottom: `${(waterTargetOz / maxWaterOz) * 80}px` }}
            aria-hidden="true"
          />
          {waterChart.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: '80px' }}>
              {d.oz > 0 && (
                <div
                  className={`w-full rounded-sm ${d.oz >= waterTargetOz ? 'bg-sky-500' : 'bg-sky-700/70'}`}
                  style={{ height: `${(d.oz / maxWaterOz) * 100}%` }}
                  title={tr.ozTip(d.oz)}
                />
              )}
            </div>
          ))}
        </div>
        {range === 7 && (
          <div className="flex gap-1 mt-1.5">
            {waterChart.map((d, i) => (
              <span key={i} className="flex-1 text-center text-xs text-stone-400 truncate">{d.label}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
            <span className="text-stone-400 text-xs">{waterLoggedDays > 0 ? tr.ozPerDayAvg(avgWaterOz) : tr.noWaterYet}</span>
          </div>
          <div className="ml-auto text-stone-400 text-xs">
            {tr.targetLabel} <span className="text-white">{tr.ozUnit(waterTargetOz)}</span>
          </div>
        </div>
      </div>

      {/* Average macros vs target */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h2 className="text-white font-semibold text-sm mb-3">{tr.avgMacros}</h2>
        <div className="space-y-2.5">
          {MACRO_KEYS.map(key => {
            const meta = MACRO_META[key]
            const avg = Math.round(summary.avgMacros[key] ?? 0)
            const target = macroTargets[key] ?? 0
            const pct = target > 0 ? Math.min(100, Math.round((avg / target) * 100)) : 0
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{meta.emoji}</span>
                <span className="text-stone-400 text-xs w-14">{t.macros[key]}</span>
                <div className="flex-1 h-2 rounded-full bg-stone-700 overflow-hidden">
                  <div className={`h-full rounded-full ${meta.color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-stone-300 text-xs w-16 text-right tabular-nums">{tr.macroValue(avg, target)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Micronutrient consistency */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-emerald-400" />
          <h2 className="text-white font-semibold text-sm">{tr.microTitle}</h2>
        </div>
        {summary.loggedDays === 0 ? (
          <p className="text-stone-400 text-xs">{tr.microEmpty}</p>
        ) : (
          <div className="space-y-2">
            {micros.map(mc => {
              const pct = mc.daysLogged > 0 ? (mc.daysHit / mc.daysLogged) * 100 : 0
              return (
                <div key={mc.key} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{mc.emoji}</span>
                  <span className="text-stone-400 text-xs w-20">{t.nutrients[mc.key]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-stone-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 35 ? 'bg-yellow-400' : 'bg-red-500/70'}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                  <span className="text-stone-400 text-xs w-20 text-right">{tr.hitDays(mc.daysHit, mc.daysLogged)}</span>
                </div>
              )
            })}
            <p className="text-stone-400 text-xs pt-1">{tr.microFootnote}</p>
          </div>
        )}
      </div>

      {/* Weight — at the bottom of the page */}
      <div id="weight-card" className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 scroll-mt-20 transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-sky-400" />
            <h2 className="text-white font-semibold text-sm">{tr.weight}</h2>
          </div>
          {weightInRange.length >= 2 && (
            <span className={`text-xs font-semibold ${weightDelta < 0 ? 'text-emerald-400' : weightDelta > 0 ? 'text-orange-400' : 'text-stone-400'}`}>
              {tr.weightDelta(weightDelta > 0 ? '+' : '', (weightDelta * 2.20462).toFixed(1), range)}
            </span>
          )}
        </div>

        {weightInRange.length >= 2 ? (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-28"
              role="img"
              aria-label={tr.weightAria(kgToLbs(cVals[0]), kgToLbs(cVals[cVals.length - 1]), range)}
            >
              <polyline points={polyline} fill="none" stroke="rgb(56 189 248)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="rgb(56 189 248)" />
              ))}
            </svg>
            {/* Axis endpoints so the line is actually readable */}
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>{tr.axisPoint(fmtDate(weightInRange[0].logged_at), kgToLbs(weightInRange[0].weight_kg))}</span>
              <span>{tr.axisPoint(fmtDate(weightInRange[weightInRange.length - 1].logged_at), kgToLbs(weightInRange[weightInRange.length - 1].weight_kg))}</span>
            </div>
          </>
        ) : (
          <p className="text-stone-400 text-xs mb-3">
            {currentWeightKg ? tr.currentPrefix(kgToLbs(currentWeightKg)) : ''}{tr.weightHint(range)}
          </p>
        )}

        {/* Goal weight progress + milestone celebration */}
        {goal && (
          <div className={`mt-3 rounded-xl px-4 py-3 border ${goal.reached ? 'bg-amber-950/40 border-amber-700/50' : 'bg-stone-800/50 border-stone-700'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-stone-300 text-xs font-medium">{tr.goalLabel(goal.targetLbs)}</span>
              <span className={`text-xs font-semibold ${goal.reached ? 'text-amber-300' : 'text-sky-300'} tabular-nums`}>
                {goal.reached ? tr.reached : tr.lbsToGo(goal.remainingLbs.toFixed(1))}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-stone-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${goal.reached ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-600 to-sky-400'}`} style={{ width: `${Math.max(2, goal.pct)}%` }} />
              {[25, 50, 75].map(m => (
                <span key={m} className="absolute top-0 bottom-0 w-px bg-stone-900/70" style={{ left: `${m}%` }} />
              ))}
            </div>
            <p className={`text-xs mt-2 ${goal.reached ? 'text-amber-300' : 'text-stone-300'}`}>
              {MILESTONE_MSG[goal.milestone]} <span className="text-stone-400">{tr.pctSuffix(goal.pct)}</span>
            </p>
          </div>
        )}

        {/* Log weight */}
        <form onSubmit={logWeight} className="flex gap-2 mt-3">
          <input
            ref={weightInputRef}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder={currentWeightKg ? tr.weightPlaceholder(kgToLbs(currentWeightKg)) : tr.weightPlaceholderEmpty}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={savingWeight || !weightInput}
            className="flex items-center gap-1 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold px-3 rounded-xl transition-colors"
          >
            <Plus size={14} /> {tr.logButton}
          </button>
        </form>
        {weightError && <p className="text-red-400 text-xs mt-2">{weightError}</p>}
      </div>

      <LogFab />
      <BottomNav active="trends" />
    </div>
  )
}
