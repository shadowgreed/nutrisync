'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Lock, AlertCircle, Sparkles, Send, RotateCcw, X, Check, ArrowUp, ArrowDown, Flame, Utensils, Copy } from 'lucide-react'
import type { AttentionLevel, ClientSignal } from '@/lib/copilot'
import type { WeeklyReport } from '@/lib/weekly'
import { mlToOz, type WaterWeek } from '@/lib/water'
import { GOAL_LABELS, GOAL_EMOJIS } from '@/lib/fitness'
import { DRAFT_TONES, type DraftTone } from '@/lib/copilot-tones'
import { foodFixesFor } from '@/lib/nutrients'
import { SEVERITY_STYLE, type MemberIntel, type TrendData } from '@/lib/coach-intel'
import { ShieldCheck, AlertTriangle, Target as TargetIcon, Minus } from 'lucide-react'
import type { Diet, Goal, NutrientKey } from '@/types'
import CoachDietSetting from './CoachDietSetting'

export interface CoachNote { id: string; body: string; created_at: string }
export interface PendingDraft { id: string; kind: 'nudge' | 'praise' | 'weekly_checkin'; draft_text: string; status: string; created_at: string }
export interface MiniPost { id: string; meal_type: string; caption: string | null; total_calories: number | null; photo_url: string | null; logged_at: string }

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍎',
}

/** Compact relative time for the mini feed, e.g. "3h ago", "2d ago". */
function relTime(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.round(days / 7)}w ago`
}

const KIND_LABEL: Record<PendingDraft['kind'], string> = {
  nudge: 'Nudge', praise: 'Praise', weekly_checkin: 'Weekly check-in',
}

interface Member { id: string; display_name: string; avatar_url: string | null }

const ATTENTION_LABEL: Record<AttentionLevel, { label: string; chip: string }> = {
  needs_attention: { label: 'Needs attention', chip: 'bg-red-900/50 text-red-200 border-red-800/60' },
  watch:           { label: 'Worth a look',     chip: 'bg-amber-900/40 text-amber-200 border-amber-800/60' },
  on_track:        { label: 'On track',         chip: 'bg-emerald-900/40 text-emerald-200 border-emerald-800/60' },
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// Week-over-week trend for a stat card. `tone` colors the arrow: 'good' green,
// 'bad' red, 'neutral' stone (used for calories, where up/down isn't inherently
// better — it depends on the member's goal).
interface Delta { dir: 'up' | 'down'; pct: number | null; tone: 'good' | 'bad' | 'neutral' }

/**
 * Compare this week's value to last week's. `higherIsBetter` decides the color
 * (null = neutral). Returns null when there's nothing to compare (no prior data
 * or no change), so unchanged/first-week cards simply show no arrow.
 */
function makeDelta(current: number, prior: number | null, higherIsBetter: boolean | null): Delta | null {
  if (prior === null) return null
  const diff = current - prior
  if (diff === 0) return null
  const dir: Delta['dir'] = diff > 0 ? 'up' : 'down'
  const pct = prior > 0 ? Math.round((diff / prior) * 100) : null
  const tone: Delta['tone'] = higherIsBetter === null ? 'neutral' : (diff > 0) === higherIsBetter ? 'good' : 'bad'
  return { dir, pct, tone }
}

const DELTA_TONE: Record<Delta['tone'], string> = {
  good: 'text-emerald-400', bad: 'text-red-400', neutral: 'text-stone-400',
}

function Stat({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: Delta | null }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
      <p className="text-stone-400 text-[11px] uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-extrabold tabular-nums mt-1">{value}</p>
      {delta && (
        <p className={`flex items-center justify-center gap-0.5 text-[11px] font-semibold mt-0.5 ${DELTA_TONE[delta.tone]}`}>
          {delta.dir === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
          {delta.pct !== null ? `${delta.pct > 0 ? '+' : ''}${delta.pct}%` : 'vs last wk'}
        </p>
      )}
      {sub && <p className="text-stone-500 text-[11px] mt-0.5">{sub}</p>}
    </div>
  )
}

// A single flagged signal. For a nutrient gap it also offers a one-tap
// "Suggest foods" reveal — the same whole-food fixes used by "Close my gaps" —
// so the coach has concrete suggestions to weave into a message.
function SignalItem({ signal }: { signal: ClientSignal }) {
  const [showFoods, setShowFoods] = useState(false)
  const gapKey = signal.code === 'nutrient_gap' && typeof signal.data.key === 'string'
    ? (signal.data.key as NutrientKey)
    : null
  const foods = gapKey ? foodFixesFor(gapKey) : []

  return (
    <li className={`text-sm rounded-xl px-3 py-2 border ${
      signal.severity === 'warn'
        ? 'bg-amber-950/40 border-amber-900/50 text-amber-100'
        : 'bg-stone-900 border-stone-800 text-stone-300'
    }`}>
      <div className="flex items-center gap-2">
        <AlertCircle size={15} className="shrink-0 opacity-80" />
        <span className="flex-1">{signal.label}</span>
        {gapKey && foods.length > 0 && (
          <button
            onClick={() => setShowFoods(v => !v)}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
          >
            <Utensils size={12} /> {showFoods ? 'Hide' : 'Suggest foods'}
          </button>
        )}
      </div>
      {showFoods && foods.length > 0 && (
        <ul className="mt-2 ml-6 space-y-1">
          {foods.map((f, i) => (
            <li key={i} className="text-[12px] text-stone-300">
              <span className="font-medium text-stone-100">{f.name}</span>
              <span className="text-stone-500"> · {f.serving}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// ── AI summary card — the most important component: what's happening, why,
// the risk and the recommended action, all computed deterministically.
function AiSummaryCard({ intel, memberName }: { intel: MemberIntel; memberName: string }) {
  const { summary, confidence } = intel
  return (
    <section className="px-4 mb-4">
      <div className="bg-gradient-to-br from-emerald-950/50 to-stone-900 border border-emerald-900/50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400" />
            <p className="text-emerald-300 text-xs uppercase tracking-wider font-semibold">AI summary</p>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-stone-400" title={confidence.reasons.join(' · ')}>
            <ShieldCheck size={12} /> {confidence.pct}% confidence
          </span>
        </div>
        <p className="text-white text-sm font-medium leading-snug">{summary.headline}</p>
        {summary.causes.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {summary.causes.map((c, i) => (
              <li key={i} className="text-stone-300 text-[13px] flex items-start gap-1.5">
                <span className="text-stone-500 mt-1.5 w-1 h-1 rounded-full bg-stone-500 shrink-0" /> {c}
              </li>
            ))}
          </ul>
        )}
        {summary.risk && (
          <p className="mt-2 flex items-start gap-1.5 text-amber-200 text-[13px]">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> <span><span className="font-semibold">Risk:</span> {summary.risk}</span>
          </p>
        )}
        {summary.recommendation && (
          <p className="mt-2 flex items-start gap-1.5 text-emerald-200 text-[13px]">
            <TargetIcon size={13} className="shrink-0 mt-0.5" /> <span><span className="font-semibold">Do next:</span> {summary.recommendation}</span>
          </p>
        )}
        {summary.causes.length === 0 && !summary.risk && (
          <p className="mt-1 text-stone-400 text-xs">{memberName.split(/\s+/)[0]} is on track this week — keep the encouragement coming.</p>
        )}
      </div>
    </section>
  )
}

function TrendArrow({ trend, deltaPts }: { trend: 'up' | 'down' | 'flat' | null; deltaPts: number | null }) {
  if (trend === null || deltaPts === null) return null
  if (trend === 'flat') return <span className="inline-flex items-center text-stone-500 text-[11px]"><Minus size={11} /></span>
  const up = trend === 'up'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(deltaPts)}pts
    </span>
  )
}

// ── Compliance dashboard — adherence % per area, with trend + severity ───────
function ComplianceDashboard({ intel }: { intel: MemberIntel }) {
  return (
    <section className="px-4 mb-5">
      <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Compliance</p>
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
        {intel.compliance.map(m => {
          const s = SEVERITY_STYLE[m.severity]
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-sm text-stone-200">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {m.label}
                </span>
                <span className="flex items-center gap-2">
                  <TrendArrow trend={m.trend} deltaPts={m.deltaPts} />
                  <span className={`text-sm font-bold tabular-nums ${s.text}`}>{m.pct}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${m.pct}%` }} />
              </div>
              <p className="text-stone-500 text-[11px] mt-0.5">{m.detail}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Behaviour patterns — per-meal logging consistency ────────────────────────
function BehaviorPatterns({ intel }: { intel: MemberIntel }) {
  return (
    <section className="px-4 mb-5">
      <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Behaviour patterns</p>
      <div className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800">
        {intel.behavior.map(b => {
          const s = SEVERITY_STYLE[b.severity]
          return (
            <div key={b.label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-stone-200">{b.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-stone-400 text-xs tabular-nums">{b.logged}/{b.of} days</span>
                <span className={`text-[11px] font-semibold ${s.text}`}>{b.note}</span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Trend Analysis — calories / protein / hydration bars + weight line ───────
function MiniBars({ values, labels, target, colorFor }: {
  values: number[]; labels: string[]; target: number; colorFor: (v: number) => string
}) {
  const max = Math.max(...values, target, 1) * 1.1
  const targetTop = `${Math.max(0, 100 - (target / max) * 100)}%`
  return (
    <div className="relative h-20 flex items-end gap-px">
      {target > 0 && (
        <div className="absolute left-0 right-0 border-t border-dashed border-stone-600/70" style={{ top: targetTop }} />
      )}
      {values.map((v, i) => (
        <div
          key={i}
          title={`${labels[i]}: ${v.toLocaleString()}`}
          className={`flex-1 rounded-sm ${v > 0 ? colorFor(v) : 'bg-stone-800'}`}
          style={{ height: `${Math.max(v > 0 ? 4 : 2, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

function WeightLine({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) {
    return <p className="text-stone-500 text-xs py-6 text-center">Not enough weight logs in range.</p>
  }
  const W = 320, H = 72, pad = 8
  const vals = points.map(p => p.kg)
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1
  const pts = points.map((p, i) => {
    const x = pad + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - 2 * pad)
    const y = pad + (1 - (p.kg - min) / span) * (H - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="rgb(139 92 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrendAnalysis({ trends }: { trends: TrendData }) {
  const [range, setRange] = useState<14 | 30>(14)
  const days = trends.days.slice(-range)
  const labels = days.map(d => d.label)
  const cal = days.map(d => d.calories)
  const prot = days.map(d => d.protein)
  const wat = days.map(d => d.waterOz)
  const weights = trends.weights.filter(w => {
    const floor = Date.now() - range * 86400000
    return new Date(w.date).getTime() >= floor
  })
  const loggedCals = cal.filter(v => v > 0)
  const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : 0

  const calColor = (v: number) => Math.abs(v - trends.calorieTarget) <= trends.calorieTarget * 0.15 ? 'bg-emerald-500' : 'bg-amber-500'
  const goalColor = (target: number) => (v: number) => v >= target ? 'bg-emerald-500' : v >= target * 0.6 ? 'bg-amber-400' : 'bg-stone-600'

  return (
    <section className="px-4 mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-stone-400 text-xs uppercase tracking-wider">Trend analysis</p>
        <div className="flex bg-stone-800 rounded-lg p-0.5">
          {([14, 30] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${range === r ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>
              {r}d
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <TrendCard title="Calories" sub={`avg ${avg(loggedCals).toLocaleString()} · target ${trends.calorieTarget.toLocaleString()}`}>
          <MiniBars values={cal} labels={labels} target={trends.calorieTarget} colorFor={calColor} />
        </TrendCard>
        <TrendCard title="Protein" sub={`avg ${avg(prot.filter(v => v > 0))}g · target ${trends.proteinTarget}g`}>
          <MiniBars values={prot} labels={labels} target={trends.proteinTarget} colorFor={goalColor(trends.proteinTarget)} />
        </TrendCard>
        <TrendCard title="Hydration" sub={`avg ${avg(wat.filter(v => v > 0))} oz · target ${trends.waterTargetOz} oz`}>
          <MiniBars values={wat} labels={labels} target={trends.waterTargetOz} colorFor={goalColor(trends.waterTargetOz)} />
        </TrendCard>
        <TrendCard title="Weight" sub={weights.length >= 2 ? `${weights[0].kg.toFixed(1)} → ${weights[weights.length - 1].kg.toFixed(1)} kg` : ''}>
          <WeightLine points={weights} />
        </TrendCard>
      </div>
    </section>
  )
}

function TrendCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-stone-200 text-sm font-medium">{title}</p>
        <p className="text-stone-500 text-[11px]">{sub}</p>
      </div>
      {children}
    </div>
  )
}

export interface InterventionEntry { kind: 'nudge' | 'praise' | 'weekly_checkin'; created_at: string }

const KIND_TOPIC: Record<InterventionEntry['kind'], string> = {
  nudge: 'Nudge', praise: 'Praise', weekly_checkin: 'Weekly check-in',
}

// One-tap coaching plays with impact, estimated outcome and a copyable message.
function RecommendedActions({ actions }: { actions: MemberIntel['recommendedActions'] }) {
  const [copied, setCopied] = useState<number | null>(null)
  if (actions.length === 0) return null
  const impactStyle: Record<string, string> = {
    High: 'bg-red-900/40 text-red-200 border-red-800/50',
    Medium: 'bg-amber-900/40 text-amber-200 border-amber-800/50',
    Low: 'bg-stone-800 text-stone-300 border-stone-700',
  }
  function copy(i: number, text: string) {
    navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1800)
  }
  return (
    <section className="px-4 mb-5">
      <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Recommended actions</p>
      <ul className="space-y-2">
        {actions.map((a, i) => (
          <li key={i} className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-white text-sm font-semibold">{a.title}</p>
              <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${impactStyle[a.impact]}`}>{a.impact} impact</span>
            </div>
            <p className="text-stone-400 text-xs mb-2">{a.outcome}</p>
            <div className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2">
              <p className="text-stone-300 text-[13px] leading-snug">{a.message}</p>
            </div>
            <button
              onClick={() => copy(i, a.message)}
              className="mt-2 inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 text-xs font-semibold"
            >
              {copied === i ? <Check size={13} /> : <Copy size={13} />} {copied === i ? 'Copied' : 'Copy message'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Past check-ins the coach has sent — prevents repetitive coaching.
function InterventionHistory({ history }: { history: InterventionEntry[] }) {
  if (history.length === 0) return null
  return (
    <section className="px-4 mb-5">
      <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Intervention history</p>
      <ul className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800">
        {history.map((h, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-stone-200 text-sm">{KIND_TOPIC[h.kind]}</p>
              <p className="text-stone-500 text-[11px]">{new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
            <span className="text-emerald-400/80 text-xs">Check-in sent</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function QuickAction({ icon, label, onClick, active }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
        active ? 'text-emerald-400' : 'text-stone-300 hover:text-white hover:bg-stone-900'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

export default function CoachMemberClient({
  member, groupId, coachId, memberDiet, dietOverride, attention, signals, report, priorReport, streak, water, priorWater, goal, intel, trends, history, reviewedAt, posts, initialNotes, initialDraft,
}: {
  member: Member; groupId: string; coachId: string
  memberDiet: Diet | null; dietOverride: Diet | null
  attention: AttentionLevel
  signals: ClientSignal[]; report: WeeklyReport; priorReport: WeeklyReport | null
  streak: number; water: WaterWeek; priorWater: WaterWeek | null; goal: string | null
  intel: MemberIntel
  trends: TrendData
  history: InterventionEntry[]
  reviewedAt: string | null
  posts: MiniPost[]
  initialNotes: CoachNote[]; initialDraft: PendingDraft | null
}) {
  const [notes, setNotes] = useState<CoachNote[]>(initialNotes)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const meta = ATTENTION_LABEL[attention]

  // ── Week-over-week trend arrows on the summary cards ───────────────────────
  // Prior-week values are null when there's no comparable data, which yields no
  // arrow. Calories are tone-neutral (over/under depends on the member's goal);
  // nutrients, active days and hydration are "higher is better".
  const priorCals = priorReport && priorReport.daysLogged ? priorReport.calories.avgPerDay : null
  const priorNut = priorReport && priorReport.daysLogged ? priorReport.nutrients.onTrack : null
  const priorActive = priorReport ? priorReport.activities.activeDays : null
  const calDelta = report.daysLogged ? makeDelta(report.calories.avgPerDay, priorCals, null) : null
  const nutDelta = report.daysLogged ? makeDelta(report.nutrients.onTrack, priorNut, true) : null
  const actDelta = makeDelta(report.activities.activeDays, priorActive, true)
  const waterDelta = water.daysLogged ? makeDelta(water.daysHit, priorWater ? priorWater.daysHit : null, true) : null

  // ── Header context line — goal + streak, adapted to available data ─────────
  const goalLabel = goal && goal in GOAL_LABELS
    ? `${GOAL_EMOJIS[goal as Goal]} ${GOAL_LABELS[goal as Goal]}`
    : null
  const contextBits = [
    goalLabel,
    streak > 0 ? `${streak} day streak` : null,
  ].filter(Boolean) as string[]
  // The single most important reason this member surfaced (most severe signal first).
  const topReason = [...signals].sort((a, b) =>
    (b.severity === 'warn' ? 1 : 0) - (a.severity === 'warn' ? 1 : 0))[0] ?? null

  // One-line summary of exactly what a draft would be based on this week.
  const copilotContext = report.daysLogged
    ? [`${report.daysLogged}/7 days logged`,
       `${report.calories.avgPerDay.toLocaleString()} kcal/day`,
       topReason ? topReason.label : null].filter(Boolean).join(' · ')
    : 'No meals logged this week yet'

  // ── Copilot draft state ────────────────────────────────────────────────────
  const [pending, setPending] = useState<PendingDraft | null>(initialDraft)
  const [draftText, setDraftText] = useState(initialDraft?.draft_text ?? '')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [copilotError, setCopilotError] = useState('')
  const [tone, setTone] = useState<DraftTone>('auto')

  async function generateDraft() {
    if (generating) return
    setGenerating(true); setCopilotError(''); setSentOk(false)
    try {
      const res = await fetch('/api/coach/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, tone }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not draft a message')
      setPending(json.draft as PendingDraft)
      setDraftText((json.draft as PendingDraft).draft_text)
    } catch (e) {
      setCopilotError(e instanceof Error ? e.message : 'Could not draft a message')
    } finally {
      setGenerating(false)
    }
  }

  async function resolveDraft(action: 'send' | 'dismiss') {
    if (!pending || sending) return
    setSending(true); setCopilotError('')
    try {
      const res = await fetch('/api/coach/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: pending.id, action, text: action === 'send' ? draftText : undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not complete that')
      setPending(null); setDraftText('')
      if (action === 'send') setSentOk(true)
    } catch (e) {
      setCopilotError(e instanceof Error ? e.message : 'Could not complete that')
    } finally {
      setSending(false)
    }
  }

  async function addNote() {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/coach/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, memberId: member.id, body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not save note')
      setNotes(prev => [json.note as CoachNote, ...prev])
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save note')
    } finally {
      setSaving(false)
    }
  }

  async function removeNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))
    await fetch('/api/coach/note', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  // ── Quick-actions bar ───────────────────────────────────────────────────────
  const [reviewed, setReviewed] = useState<string | null>(reviewedAt)
  const [reviewing, setReviewing] = useState(false)
  const reviewedToday = !!reviewed && new Date(reviewed).toDateString() === new Date().toDateString()

  async function markReviewed() {
    if (reviewing) return
    setReviewing(true)
    try {
      const res = await fetch('/api/coach/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setReviewed(json.reviewed_at ?? new Date().toISOString())
    } finally {
      setReviewing(false)
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function focusNote() {
    scrollTo('coach-notes')
    setTimeout(() => document.getElementById('coach-note-input')?.focus(), 350)
  }
  function draftFromBar() {
    scrollTo('copilot')
    if (!pending) generateDraft()
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-28">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href="/coach" aria-label="Back to roster" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <div className="flex items-center gap-3 min-w-0">
          {member.avatar_url
            ? <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            : <div className="w-10 h-10 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-300 text-sm font-semibold">{initials(member.display_name)}</div>}
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{member.display_name}</h1>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.chip}`}>{meta.label}</span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-300">
                  <Flame size={11} /> {streak}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Context line — goal, streak, and the headline reason this client surfaced */}
      {(contextBits.length > 0 || topReason) && (
        <div className="px-4 mb-3 space-y-1">
          {contextBits.length > 0 && (
            <p className="text-stone-400 text-xs">{contextBits.join(' · ')}</p>
          )}
          {topReason && attention !== 'on_track' && (
            <p className="text-stone-200 text-sm font-medium">{topReason.label}</p>
          )}
        </div>
      )}

      {/* AI summary — what's happening, why, the risk, the recommended action */}
      {intel.hasData && <AiSummaryCard intel={intel} memberName={member.display_name} />}

      {/* Recommended actions — one-tap coaching plays */}
      {intel.hasData && <RecommendedActions actions={intel.recommendedActions} />}

      {/* Signals — why this member is flagged */}
      {signals.length > 0 && (
        <section id="key-issues" className="px-4 mb-4 scroll-mt-16">
          <ul className="space-y-1.5">
            {signals.map((s, i) => <SignalItem key={i} signal={s} />)}
          </ul>
        </section>
      )}

      {/* This week, at a glance */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">This week · {report.weekLabel}</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Calories"
            value={report.daysLogged ? report.calories.avgPerDay.toLocaleString() : '—'}
            delta={calDelta}
            sub={report.daysLogged ? `of ${report.calories.target.toLocaleString()}/day` : 'no logs'}
          />
          <Stat label="Nutrients" value={`${report.nutrients.onTrack}/${report.nutrients.total}`} delta={nutDelta} sub="on track" />
          <Stat label="Active" value={`${report.activities.activeDays}/${report.activities.goalDays}`} delta={actDelta} sub="active days" />
          <Stat
            label="Water"
            value={`${water.daysHit}/${water.goalDays}`}
            delta={waterDelta}
            sub={water.daysLogged ? `${mlToOz(water.avgMl)} oz/day · ${mlToOz(water.targetMl)} oz goal` : 'no logs'}
          />
        </div>
      </section>

      {/* Compliance dashboard — adherence %, trend and severity per area */}
      {intel.hasData && <ComplianceDashboard intel={intel} />}

      {/* Behaviour patterns — per-meal consistency */}
      {intel.hasData && <BehaviorPatterns intel={intel} />}

      {/* Trend analysis — calories / protein / hydration / weight */}
      {intel.hasData && <TrendAnalysis trends={trends} />}

      {/* Recent posts — a glance at what the client is actually sharing */}
      {posts.length > 0 && (
        <section className="px-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-stone-400 text-xs uppercase tracking-wider">Recent posts</p>
            <Link href="/feed" className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold">View feed</Link>
          </div>
          <ul className="space-y-2">
            {posts.map(p => (
              <li key={p.id} className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-2.5">
                {p.photo_url
                  ? <img src={p.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  : <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-xl shrink-0">{MEAL_EMOJI[p.meal_type] ?? '🍽️'}</div>}
                <div className="min-w-0 flex-1">
                  <p className="text-stone-200 text-sm truncate">
                    {p.caption?.trim() || <span className="capitalize">{p.meal_type}</span>}
                  </p>
                  <p className="text-stone-500 text-[11px]">
                    {relTime(p.logged_at)}
                    {p.total_calories ? ` · ${p.total_calories.toLocaleString()} kcal` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CoachDietSetting
        groupId={groupId} coachId={coachId} memberId={member.id}
        memberDiet={memberDiet} initialOverride={dietOverride}
      />

      {/* Copilot — draft a check-in the coach reviews & sends */}
      <section id="copilot" className="px-4 mb-5 scroll-mt-16">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={13} className="text-emerald-400" />
          <p className="text-stone-400 text-xs uppercase tracking-wider">Copilot</p>
        </div>

        {!pending ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            {sentOk && (
              <p className="flex items-center gap-1.5 text-emerald-300 text-sm mb-3">
                <Check size={15} /> Sent to {member.display_name}.
              </p>
            )}
            {/* What this draft will be based on */}
            <p className="text-stone-300 text-sm">
              Draft a personalized check-in from {member.display_name}&apos;s week. You review and edit it before anything sends.
            </p>
            <p className="text-stone-500 text-[11px] mt-1.5 mb-3">Based on: {copilotContext}</p>

            {/* Tone chips */}
            <p className="text-stone-400 text-[11px] uppercase tracking-wider mb-1.5">Tone</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DRAFT_TONES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  disabled={generating}
                  className={`text-[12px] font-medium px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                    tone === t.value
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={generateDraft}
              disabled={generating}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Sparkles size={15} /> {generating ? 'Drafting…' : sentOk ? 'Draft another' : 'Draft check-in (this week’s data)'}
            </button>
          </div>
        ) : (
          <div className="bg-stone-900 border border-emerald-900/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-800/60 bg-emerald-900/40 text-emerald-200">
                {KIND_LABEL[pending.kind]}
              </span>
              <span className="text-stone-500 text-[11px]">Draft — review before sending</span>
            </div>
            <textarea
              value={draftText}
              onChange={e => setDraftText(e.target.value.slice(0, 2000))}
              rows={4}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => resolveDraft('send')}
                disabled={sending || !draftText.trim()}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Send size={14} /> {sending ? 'Sending…' : 'Send'}
              </button>
              <button
                onClick={generateDraft}
                disabled={generating || sending}
                aria-label="Regenerate draft"
                className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                <RotateCcw size={14} /> {generating ? '…' : 'Redo'}
              </button>
              <button
                onClick={() => resolveDraft('dismiss')}
                disabled={sending}
                aria-label="Dismiss draft"
                className="ml-auto flex items-center gap-1.5 text-stone-400 hover:text-red-300 text-sm px-2 py-2 transition-colors"
              >
                <X size={15} /> Dismiss
              </button>
            </div>
          </div>
        )}
        {copilotError && <p className="text-red-400 text-xs mt-2">{copilotError}</p>}
        <p className="text-stone-600 text-[11px] mt-2">Copilot drafts; you send it in your own voice. Nothing reaches {member.display_name} until you hit Send.</p>
      </section>

      {/* Intervention history — what's already been sent */}
      <InterventionHistory history={history} />

      {/* Private coach notes */}
      <section id="coach-notes" className="px-4 scroll-mt-16">
        <div className="flex items-center gap-1.5 mb-2">
          <Lock size={13} className="text-stone-500" />
          <p className="text-stone-400 text-xs uppercase tracking-wider">Private notes</p>
        </div>
        <p className="text-stone-500 text-[11px] mb-2">Only you can see these — {member.display_name} can&apos;t.</p>

        <div className="flex gap-2 mb-3">
          <textarea
            id="coach-note-input"
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 2000))}
            placeholder={`Note about ${member.display_name}…`}
            rows={2}
            className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          <button
            onClick={addNote}
            disabled={!draft.trim() || saving}
            className="shrink-0 self-end bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <ul className="space-y-2">
          {notes.map(n => (
            <li key={n.id} className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex items-start gap-2">
              <p className="flex-1 text-stone-200 text-sm whitespace-pre-wrap break-words">{n.body}</p>
              <button onClick={() => removeNote(n.id)} aria-label="Delete note" className="shrink-0 text-stone-500 hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {notes.length === 0 && <li className="text-stone-500 text-sm">No notes yet.</li>}
        </ul>
      </section>

      {/* Sticky quick-actions bar — message / draft / suggest foods / note / reviewed */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur border-t border-stone-800 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-stretch gap-1 max-w-xl mx-auto">
          <QuickAction icon={<Send size={16} />} label="Message" onClick={draftFromBar} />
          <QuickAction icon={<Sparkles size={16} />} label="Draft" onClick={draftFromBar} />
          <QuickAction icon={<Utensils size={16} />} label="Foods" onClick={() => scrollTo(signals.length ? 'key-issues' : 'copilot')} />
          <QuickAction icon={<Lock size={16} />} label="Note" onClick={focusNote} />
          <QuickAction
            icon={reviewedToday ? <Check size={16} /> : <ShieldCheck size={16} />}
            label={reviewedToday ? 'Reviewed' : reviewing ? '…' : 'Review'}
            onClick={markReviewed}
            active={reviewedToday}
          />
        </div>
      </div>
    </div>
  )
}
