'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scale, TrendingUp, Plus } from 'lucide-react'
import { BottomNav } from '../dashboard/DashboardClient'
import { summarize, microConsistency, type DayTotal } from '@/lib/trends'
import { MACRO_KEYS, MACRO_META } from '@/lib/macros'
import { kgToLbs, lbsToKg } from '@/lib/fitness'
import type { MacroTargets } from '@/types'

interface WeightLog { weight_kg: number; logged_at: string }

interface Props {
  series30: DayTotal[]
  calorieTarget: number | null
  macroTargets: MacroTargets
  weightLogs: WeightLog[]
  currentWeightKg: number | null
  targetWeightKg: number | null
}

export default function TrendsClient({ series30, calorieTarget, macroTargets, weightLogs, currentWeightKg, targetWeightKg }: Props) {
  const router = useRouter()
  const [range, setRange] = useState<7 | 30>(7)
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightError, setWeightError] = useState('')

  const series = range === 7 ? series30.slice(-7) : series30
  const summary = summarize(series)
  const micros = microConsistency(series)

  const maxCal = Math.max(calorieTarget ?? 0, ...series.map(d => d.calories), 1)
  const targetPct = calorieTarget ? (calorieTarget / maxCal) * 100 : null

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
      if (!res.ok) { setWeightError(data.error ?? 'Failed to save'); return }
      setWeightInput('')
      router.refresh()
    } finally {
      setSavingWeight(false)
    }
  }

  // Weight chart geometry
  const W = 320, H = 110, pad = 10
  const vals = weightLogs.map(w => w.weight_kg)
  const minW = vals.length ? Math.min(...vals) : 0
  const maxW = vals.length ? Math.max(...vals) : 0
  const span = maxW - minW || 1
  const pts = weightLogs.map((w, i) => {
    const x = pad + (weightLogs.length === 1 ? 0.5 : i / (weightLogs.length - 1)) * (W - 2 * pad)
    const y = pad + (1 - (w.weight_kg - minW) / span) * (H - 2 * pad)
    return { x, y, w: w.weight_kg }
  })
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const weightDelta = vals.length >= 2 ? vals[vals.length - 1] - vals[0] : 0

  // ── Goal-weight progress (in 25% milestones) ──
  const startKg = vals.length ? vals[0] : currentWeightKg
  const nowKg = vals.length ? vals[vals.length - 1] : currentWeightKg
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
    0: 'Off to a start — every log counts!',
    25: '💪 25% of the way there — keep going!',
    50: '🎉 Halfway to your goal!',
    75: '🔥 75% there — so close!',
    100: '🏆 Goal weight reached. Amazing work!',
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm">Your progress</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">Trends</h1>
        </div>
        {/* Range toggle */}
        <div className="flex bg-stone-800 rounded-xl p-1">
          {([7, 30] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                range === r ? 'bg-stone-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
          <p className="text-stone-400 text-xs">Avg calories / day</p>
          <p className="text-white text-2xl font-bold mt-0.5">{summary.avgCalories || '—'}</p>
          {calorieTarget && summary.avgCalories > 0 && (
            <p className="text-stone-400 text-xs">target {calorieTarget}</p>
          )}
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
          <p className="text-stone-400 text-xs">Days logged</p>
          <p className="text-white text-2xl font-bold mt-0.5">{summary.loggedDays}<span className="text-stone-400 text-base font-normal"> / {range}</span></p>
          <p className="text-stone-400 text-xs">{Math.round((summary.loggedDays / range) * 100)}% consistency</p>
        </div>
      </div>

      {/* Calorie bar chart */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-3">Calories logged</p>
        <div className="relative h-32 flex items-end gap-1">
          {targetPct != null && (
            <div className="absolute left-0 right-0 border-t border-dashed border-emerald-500/50 z-10" style={{ bottom: `${targetPct}%` }}>
              <span className="absolute -top-2 right-0 text-[11px] text-emerald-500/80 bg-stone-900 px-1">target</span>
            </div>
          )}
          {series.map((d, i) => {
            const h = (d.calories / maxCal) * 100
            const over = calorieTarget != null && d.calories > calorieTarget
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.label}: ${d.calories} kcal`}>
                {/* Value label above the bar (7-day view only — 30-day is too dense) */}
                {range === 7 && d.calories > 0 && (
                  <span className="text-[11px] text-stone-300 mb-0.5 tabular-nums leading-none">{d.calories}</span>
                )}
                <div
                  className={`w-full rounded-t ${d.calories === 0 ? 'bg-stone-800' : over ? 'bg-red-500/70' : 'bg-emerald-500/70'}`}
                  style={{ height: `${Math.max(d.calories === 0 ? 2 : 4, h)}%` }}
                />
              </div>
            )
          })}
        </div>
        {range === 7 && (
          <div className="flex gap-1 mt-1.5">
            {series.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[11px] text-stone-400 truncate">
                {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Average macros vs target */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <p className="text-white font-semibold text-sm mb-3">Avg macros / logged day</p>
        <div className="space-y-2.5">
          {MACRO_KEYS.map(key => {
            const meta = MACRO_META[key]
            const avg = Math.round(summary.avgMacros[key] ?? 0)
            const target = macroTargets[key] ?? 0
            const pct = target > 0 ? Math.min(100, Math.round((avg / target) * 100)) : 0
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{meta.emoji}</span>
                <span className="text-stone-400 text-xs w-14">{meta.label}</span>
                <div className="flex-1 h-2 rounded-full bg-stone-700 overflow-hidden">
                  <div className={`h-full rounded-full ${meta.color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-stone-300 text-xs w-16 text-right tabular-nums">{avg} / {target}g</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Micronutrient consistency */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-emerald-400" />
          <p className="text-white font-semibold text-sm">Micronutrient consistency</p>
        </div>
        {summary.loggedDays === 0 ? (
          <p className="text-stone-400 text-xs">Log meals to see which nutrients you hit consistently.</p>
        ) : (
          <div className="space-y-2">
            {micros.map(m => {
              const pct = m.daysLogged > 0 ? (m.daysHit / m.daysLogged) * 100 : 0
              return (
                <div key={m.key} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{m.emoji}</span>
                  <span className="text-stone-400 text-xs w-20">{m.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-stone-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 35 ? 'bg-yellow-400' : 'bg-red-500/70'}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                  <span className="text-stone-400 text-xs w-20 text-right">hit {m.daysHit}/{m.daysLogged} days</span>
                </div>
              )
            })}
            <p className="text-stone-400 text-[11px] pt-1">Days you reached 100% of the daily target.</p>
          </div>
        )}
      </div>

      {/* Weight */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-sky-400" />
            <p className="text-white font-semibold text-sm">Weight</p>
          </div>
          {weightLogs.length >= 2 && (
            <span className={`text-xs font-semibold ${weightDelta < 0 ? 'text-emerald-400' : weightDelta > 0 ? 'text-orange-400' : 'text-stone-400'}`}>
              {weightDelta > 0 ? '+' : ''}{(weightDelta * 2.20462).toFixed(1)} lbs
            </span>
          )}
        </div>

        {weightLogs.length >= 2 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
            <polyline points={polyline} fill="none" stroke="rgb(56 189 248)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="rgb(56 189 248)" />
            ))}
          </svg>
        ) : (
          <p className="text-stone-400 text-xs mb-3">
            {currentWeightKg ? `Current: ${kgToLbs(currentWeightKg)} lbs. ` : ''}Log your weight regularly to see your trend.
          </p>
        )}

        {/* Goal weight progress + milestone celebration */}
        {goal && (
          <div className={`mt-3 rounded-xl px-4 py-3 border ${goal.reached ? 'bg-amber-950/40 border-amber-700/50' : 'bg-stone-800/50 border-stone-700'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-stone-300 text-xs font-medium">Goal: {goal.targetLbs} lbs</span>
              <span className={`text-xs font-semibold ${goal.reached ? 'text-amber-300' : 'text-sky-300'} tabular-nums`}>
                {goal.reached ? 'Reached 🏆' : `${goal.remainingLbs.toFixed(1)} lbs to go`}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-stone-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${goal.reached ? 'bg-amber-400' : 'bg-gradient-to-r from-sky-600 to-sky-400'}`} style={{ width: `${Math.max(2, goal.pct)}%` }} />
              {/* 25 / 50 / 75 milestone ticks */}
              {[25, 50, 75].map(m => (
                <span key={m} className="absolute top-0 bottom-0 w-px bg-stone-900/70" style={{ left: `${m}%` }} />
              ))}
            </div>
            <p className={`text-xs mt-2 ${goal.reached ? 'text-amber-300' : 'text-stone-300'}`}>
              {MILESTONE_MSG[goal.milestone]} <span className="text-stone-400">({goal.pct}%)</span>
            </p>
          </div>
        )}

        {/* Log weight */}
        <form onSubmit={logWeight} className="flex gap-2 mt-3">
          <input
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder={currentWeightKg ? `${kgToLbs(currentWeightKg)} lbs` : 'Weight (lbs)'}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={savingWeight || !weightInput}
            className="flex items-center gap-1 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-semibold px-3 rounded-xl transition-colors"
          >
            <Plus size={14} /> Log
          </button>
        </form>
        {weightError && <p className="text-red-400 text-xs mt-2">{weightError}</p>}
      </div>

      <BottomNav active="trends" />
    </div>
  )
}
