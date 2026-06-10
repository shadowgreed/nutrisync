'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Utensils, Droplets, RefreshCw, Trash2, ChevronDown } from 'lucide-react'
import NutrientBar from '@/components/NutrientBar'
import NutrientGapPanel from '@/components/NutrientGapPanel'
import MacroDetailModal from '@/components/MacroDetailModal'
import InfoTip from '@/components/InfoTip'
import NotificationBell from '@/components/NotificationBell'
import InstallPrompt from '@/components/InstallPrompt'
import { formatOz } from '@/lib/water'
import { WEEKLY_SEEN_KEY, currentWeekKey } from '@/lib/weekly'
import { sumTotals, emptyTotals, buildGapCorrections } from '@/lib/nutrients'
import { sumMacros, emptyMacros, MACRO_KEYS, MACRO_META, macroPct } from '@/lib/macros'
import type { NutrientKey, NutrientTotals, MacroTotals, MacroTargets, MacroKey, GapCorrection } from '@/types'

interface LogRow {
  nutrient_totals: NutrientTotals
  macro_totals: MacroTotals
  total_calories: number
  meal_type: string
  logged_at: string
  foods: Array<{ name: string; macros?: MacroTotals; servingSizeG?: number }>
  id: string
}

interface WaterLog { id: string; amount_ml: number; logged_at?: string }
interface ActivityRow { calories_burned: number; logged_at: string }

interface Props {
  logs: LogRow[]
  activities: ActivityRow[]
  displayName: string
  calorieTarget: number | null
  streak: number
  macroTargets: MacroTargets
  waterTargetMl: number
  waterBottleMl: number
  initialWaterLogs: WaterLog[]
}

// Is this timestamp on the viewer's *local* calendar day? The server sends a 48h
// window because it (UTC on Vercel) can't know the user's timezone; we narrow to
// "today" here, where the browser knows the real local date.
const localDayKey = (ts: string | number | Date) => new Date(ts).toLocaleDateString('en-CA')

export default function DashboardClient({
  logs: allLogs, activities, displayName, calorieTarget, streak, macroTargets,
  waterTargetMl, waterBottleMl, initialWaterLogs,
}: Props) {
  const router = useRouter()
  const todayKey = localDayKey(Date.now())
  const logs = allLogs.filter(l => localDayKey(l.logged_at) === todayKey)
  const caloriesBurnedToday = activities
    .filter(a => localDayKey(a.logged_at) === todayKey)
    .reduce((s, a) => s + (a.calories_burned || 0), 0)
  const [activeGap, setActiveGap] = useState<GapCorrection | null>(null)
  const [activeMacro, setActiveMacro] = useState<MacroKey | null>(null)
  // Flatten today's foods (with their macros) so the macro popup can show which
  // foods contributed each macro.
  const todayFoods = logs.flatMap(l => (l.foods ?? []).map(f => ({ ...f, meal_type: l.meal_type })))

  // On Sundays, auto-open the weekly report the first time the app is opened that
  // week (the report is also reachable any day via the notification → /weekly).
  useEffect(() => {
    if (new Date().getDay() !== 0) return
    let seen: string | null = null
    try { seen = localStorage.getItem(WEEKLY_SEEN_KEY) } catch { /* ignore */ }
    if (seen !== currentWeekKey()) router.push('/weekly')
  }, [router])
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(
    initialWaterLogs.filter(w => !w.logged_at || localDayKey(w.logged_at) === todayKey),
  )
  const [addingWater, setAddingWater] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAllNutrients, setShowAllNutrients] = useState(false)

  const logsWithNoData = logs.filter(l => l.total_calories === 0 && (l.foods?.length ?? 0) > 0)

  async function deleteMeal(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/log-meal?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmDeleteId(null)
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function fixNutritionData() {
    setBackfilling(true)
    try {
      await fetch('/api/backfill-nutrition', { method: 'POST' })
      router.refresh()
    } finally {
      setBackfilling(false)
    }
  }

  const totalWater = waterLogs.reduce((s, w) => s + w.amount_ml, 0)
  const waterPct = waterTargetMl > 0 ? Math.min(100, Math.round((totalWater / waterTargetMl) * 100)) : 0
  const waterSurpassed = waterTargetMl > 0 && totalWater > waterTargetMl
  // Extra full bottles logged beyond the daily target (shown as bonus pips).
  const bonusBottles = waterSurpassed ? Math.floor((totalWater - waterTargetMl) / waterBottleMl) : 0

  const totals = logs.reduce(
    (acc, log) => sumTotals(acc, log.nutrient_totals as NutrientTotals),
    emptyTotals(),
  )

  const macroTotals = logs.reduce(
    (acc, log) => sumMacros(acc, (log.macro_totals as MacroTotals) ?? emptyMacros()),
    emptyMacros(),
  )

  const caloriesIn = logs.reduce((s, l) => s + (l.total_calories || 0), 0)
  const netCalories = caloriesIn - caloriesBurnedToday
  const calorieProgress = calorieTarget ? Math.min(100, Math.round((caloriesIn / calorieTarget) * 100)) : null

  const gaps = buildGapCorrections(totals) // sorted lowest-first
  const greenCount = gaps.filter(g => g.status === 'green').length
  const focusGaps = gaps.filter(g => g.status !== 'green').slice(0, 3) // the few to act on
  const anyLogged = logs.length > 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  async function logWater(ml: number) {
    setAddingWater(true)
    try {
      const res = await fetch('/api/log-water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: ml }),
      })
      const data = await res.json()
      if (data.log) setWaterLogs(prev => [...prev, data.log])
    } finally {
      setAddingWater(false)
    }
  }

  async function undoLastWater() {
    const last = waterLogs[waterLogs.length - 1]
    if (!last) return
    await fetch('/api/log-water', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: last.id }),
    })
    setWaterLogs(prev => prev.slice(0, -1))
  }

  const waterLabel = (ml: number) => formatOz(ml)

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-stone-400 text-sm">{greeting()}, {displayName} 👋</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">Today's snapshot</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {streak > 0 && (
            <div
              className="flex items-center gap-1.5 bg-orange-950/60 border border-orange-700/50 rounded-full px-3 py-1.5"
              role="status"
              aria-label={`${streak} day logging streak`}
            >
              <span className="text-base leading-none" aria-hidden="true">🔥</span>
              <div className="leading-none">
                <span className="text-orange-300 font-bold text-sm">{streak}</span>
                <span className="text-orange-400 text-xs"> day{streak !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
          <NotificationBell />
        </div>
      </div>

      <InstallPrompt />

      {/* Fix banner — shown when meals have no nutrition data */}
      {logsWithNoData.length > 0 && (
        <div className="mx-4 mb-4 bg-amber-950/50 border border-amber-700/50 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-amber-300 text-sm font-semibold">Nutrition data missing</p>
            <p className="text-amber-500 text-xs mt-0.5">{logsWithNoData.length} meal{logsWithNoData.length > 1 ? 's' : ''} logged without calorie/nutrient data</p>
          </div>
          <button
            onClick={fixNutritionData}
            disabled={backfilling}
            className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw size={12} className={backfilling ? 'animate-spin' : ''} />
            {backfilling ? 'Fixing…' : 'Fix now'}
          </button>
        </div>
      )}

      {/* Calorie balance hero card */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <p className="text-stone-300 text-sm font-medium">Calorie balance</p>
            <InfoTip label="Net calories" text="What you ate minus what you burned through activity. Lower than your target means a deficit." />
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            netCalories > (calorieTarget ?? 2000)
              ? 'bg-red-900/50 text-red-300'
              : netCalories < 0
              ? 'bg-emerald-900/50 text-emerald-300'
              : 'bg-stone-800 text-stone-300'
          }`}>
            {netCalories > 0 ? '+' : ''}{netCalories} net kcal
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-stone-800/60 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Utensils size={13} className="text-emerald-400" />
              <span className="text-stone-400 text-xs">Eaten</span>
            </div>
            <p className="text-white text-2xl font-bold">{caloriesIn}</p>
            <p className="text-stone-400 text-xs">kcal</p>
          </div>
          <div className="bg-stone-800/60 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={13} className="text-orange-400" />
              <span className="text-stone-400 text-xs">Burned</span>
            </div>
            <p className="text-white text-2xl font-bold">{caloriesBurnedToday}</p>
            <p className="text-stone-400 text-xs">kcal</p>
          </div>
        </div>

        {calorieTarget && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-stone-400">Progress to target</span>
              <span className="text-stone-400">{caloriesIn} / {calorieTarget} kcal</span>
            </div>
            <div className="h-2 rounded-full bg-stone-700">
              <div
                className={`h-full rounded-full transition-all ${calorieProgress! > 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${calorieProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>


      {/* ── Macros section ── */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold text-sm">Macros today</p>
          <span className="text-stone-400 text-xs">tap for details</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {MACRO_KEYS.map(key => {
            const meta = MACRO_META[key]
            const current = Math.round(macroTotals[key] ?? 0)
            const target = macroTargets[key] ?? 0
            const pct = macroPct(current, target)
            return (
              <button
                key={key}
                onClick={() => setActiveMacro(key)}
                aria-label={`See which foods provided ${meta.label} today`}
                className="flex flex-col items-center rounded-xl -mx-1 px-1 py-1 hover:bg-stone-800/70 transition-colors"
              >
                <div className="relative w-full h-2.5 rounded-full bg-stone-700 overflow-hidden mb-2">
                  <div className={`h-full rounded-full ${meta.color} transition-all`} style={{ width: `${Math.max(current > 0 ? 3 : 0, pct)}%` }} />
                </div>
                <span className="text-base leading-none mb-1" aria-hidden="true">{meta.emoji}</span>
                <span className="text-white text-sm font-bold leading-none tabular-nums">{current}<span className="text-stone-400 text-xs font-normal">g</span></span>
                <span className="text-stone-400 text-[11px] mt-0.5">{meta.label}</span>
                <span className="text-stone-400 text-[11px] tabular-nums">/ {target}g · {pct}%</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Water section ── */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets size={16} className="text-sky-400" />
            <p className="text-white font-semibold text-sm">Hydration today</p>
          </div>
          <span className={`font-bold text-sm transition-colors ${waterSurpassed ? 'text-cyan-300' : 'text-sky-400'}`}>
            {waterLabel(totalWater)} / {waterLabel(waterTargetMl)}
          </span>
        </div>

        {/* Water progress bar — shifts to a brighter cyan once the goal is passed */}
        <div className="h-3 rounded-full bg-stone-700 mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
              waterSurpassed ? 'from-sky-400 to-cyan-300' : 'from-sky-600 to-sky-400'
            }`}
            style={{ width: `${waterPct}%` }}
          />
        </div>

        {/* Bottle icons (+ bonus pips for water logged past the target) */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: Math.ceil(waterTargetMl / waterBottleMl) }).map((_, i) => {
            const bottleFilled = totalWater >= (i + 1) * waterBottleMl
            const bottlePartial = !bottleFilled && totalWater > i * waterBottleMl
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  bottleFilled ? (waterSurpassed ? 'bg-cyan-400' : 'bg-sky-500') : bottlePartial ? 'bg-sky-700' : 'bg-stone-700'
                }`}
              />
            )
          })}
          {Array.from({ length: bonusBottles }).map((_, i) => (
            <div key={`bonus-${i}`} className="flex-1 h-2 rounded-full bg-cyan-300/80" />
          ))}
        </div>

        {/* Quick-add buttons — bottle-focused */}
        <div className="flex gap-2">
          <button
            onClick={() => logWater(waterBottleMl)}
            disabled={addingWater}
            aria-label={`Add one bottle, ${waterLabel(waterBottleMl)}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-sky-800/60 hover:bg-sky-700/60 border border-sky-700/40 text-sky-200 text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <Droplets size={14} aria-hidden="true" />
            +1 bottle <span className="text-sky-300/80">· {waterLabel(waterBottleMl)}</span>
          </button>
          <button
            onClick={() => logWater(Math.round(waterBottleMl / 2))}
            disabled={addingWater}
            aria-label={`Add half a bottle, ${waterLabel(Math.round(waterBottleMl / 2))}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            +½ bottle <span className="text-stone-400">· {waterLabel(Math.round(waterBottleMl / 2))}</span>
          </button>
          {waterLogs.length > 0 && (
            <button
              onClick={undoLastWater}
              aria-label="Undo last water entry"
              className="px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-red-300 text-xs py-3 rounded-xl transition-colors"
            >
              Undo
            </button>
          )}
        </div>

        {waterSurpassed ? (
          <p className="text-center text-cyan-300 text-xs mt-2 font-medium">Goal surpassed! 🌊 +{waterLabel(totalWater - waterTargetMl)} over</p>
        ) : waterPct >= 100 ? (
          <p className="text-center text-sky-400 text-xs mt-2 font-medium">Goal reached! 🎉</p>
        ) : null}
      </div>

      {/* Micronutrients — de-densified: positive summary + focus 3 + view all */}
      <div className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <p className="text-white font-semibold text-sm">Micronutrients</p>
            <InfoTip label="Micronutrients" text="Vitamins and minerals your body needs in small amounts (mg = milligrams, mcg = micrograms). Aim to reach 100% of each daily target." />
          </div>
          <span className="text-stone-300 text-xs tabular-nums">{greenCount} of {gaps.length} on track</span>
        </div>

        {!anyLogged ? (
          <p className="text-stone-400 text-sm mt-2">Log a meal to see your vitamins &amp; minerals.</p>
        ) : focusGaps.length === 0 ? (
          <p className="text-emerald-300 text-sm mt-2">🎉 Every nutrient on track today — great work!</p>
        ) : (
          <>
            <p className="text-stone-400 text-xs mt-1 mb-3">Focus on these {focusGaps.length} to round out your day:</p>
            <div className="space-y-2">
              {focusGaps.map(gap => (
                <NutrientBar key={gap.nutrient} nutrientKey={gap.nutrient as NutrientKey} value={gap.current} onClick={() => setActiveGap(gap)} />
              ))}
            </div>
          </>
        )}

        {anyLogged && (
          <>
            <button
              onClick={() => setShowAllNutrients(v => !v)}
              aria-expanded={showAllNutrients}
              className="mt-3 w-full flex items-center justify-center gap-1 text-stone-300 hover:text-white text-xs font-medium py-2.5 rounded-lg hover:bg-stone-800 transition-colors"
            >
              {showAllNutrients ? 'Hide' : `View all ${gaps.length} nutrients`}
              <ChevronDown size={14} className={`transition-transform ${showAllNutrients ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {showAllNutrients && (
              <div className="space-y-2 mt-2">
                {gaps.map(gap => (
                  <NutrientBar
                    key={gap.nutrient}
                    nutrientKey={gap.nutrient as NutrientKey}
                    value={gap.current}
                    onClick={gap.status !== 'green' ? () => setActiveGap(gap) : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Today's meals */}
      {logs.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-stone-400 text-xs uppercase tracking-wider mb-3">Today's meals</p>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white text-sm font-medium capitalize">{log.meal_type}</span>
                  <div className="flex items-center gap-2">
                    {log.total_calories > 0 && (
                      <span className="text-stone-400 text-xs">{log.total_calories} kcal</span>
                    )}
                    <span className="text-stone-400 text-xs">
                      {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {confirmDeleteId === log.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMeal(log.id)}
                          disabled={deletingId === log.id}
                          className="text-red-300 hover:text-red-200 text-xs font-semibold px-3 py-2 rounded-lg bg-red-950/60 transition-colors disabled:opacity-50"
                        >
                          {deletingId === log.id ? '…' : 'Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-stone-300 hover:text-white text-xs px-3 py-2 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(log.id)}
                        aria-label={`Delete ${log.meal_type}`}
                        className="text-stone-400 hover:text-red-300 transition-colors p-2.5 -m-1.5"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-stone-400 text-xs truncate">
                  {log.foods.map(f => f.name).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="mx-4 text-center py-10 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl">
          <p className="text-3xl mb-2">🥗</p>
          <p className="text-stone-400 text-sm font-medium">No meals logged yet</p>
          <p className="text-stone-400 text-xs mt-1">Tap Log to add your first meal</p>
        </div>
      )}

      {activeGap && (
        <NutrientGapPanel gap={activeGap} onClose={() => setActiveGap(null)} />
      )}

      {activeMacro && (
        <MacroDetailModal macroKey={activeMacro} foods={todayFoods} onClose={() => setActiveMacro(null)} />
      )}

      <BottomNav active="dashboard" />
    </div>
  )
}

export function BottomNav({ active }: { active: string }) {
  const items = [
    { href: '/dashboard', label: 'today',   emoji: '📊', key: 'dashboard' },
    { href: '/log',       label: 'log',      emoji: '➕', key: 'log' },
    { href: '/trends',    label: 'trends',   emoji: '📈', key: 'trends' },
    { href: '/feed',      label: 'feed',     emoji: '👥', key: 'feed' },
    { href: '/profile',   label: 'profile',  emoji: '👤', key: 'profile' },
  ]
  return (
    <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 bg-stone-950/95 border-t border-stone-800 flex backdrop-blur-sm">
      {items.map(item => {
        const isActive = active === item.key
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 min-h-[52px] gap-0.5 transition-colors ${
              isActive ? 'text-emerald-400' : 'text-stone-300 hover:text-white'
            }`}
          >
            <span className="text-xl" aria-hidden="true">{item.emoji}</span>
            <span className="text-xs capitalize">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
