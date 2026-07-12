'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'
import { BottomNav } from '../dashboard/DashboardClient'
import {
  CHALLENGE_METRICS, CHALLENGE_CATEGORIES, suggestedGoal,
  type ChallengeMetric, type ChallengeStatus,
} from '@/lib/challenges'
import { useI18n } from '@/components/I18nProvider'
import type { Dict } from '@/lib/i18n/dictionaries'

type ChallengesStrings = Dict['challenges']

export interface LeaderRow {
  userId: string
  name: string
  avatarUrl: string | null
  progress: number
  streak: number
  done: boolean
  todayDone: boolean
  rank: number
}

export interface FeedEvent {
  emoji: string
  text: string
}

export interface ChallengeView {
  id: string
  title: string
  metric: ChallengeMetric
  goal: number
  start_date: string
  end_date: string
  created_by: string
  status: ChallengeStatus
  dayIndex: number
  totalDays: number
  remaining: number
  leaderboard: LeaderRow[]
  me: LeaderRow | null
  teamProgress: number
  teamGoal: number
  teamPct: number
  todayCount: number
  participantCount: number
  feed: FeedEvent[]
  banner: string | null
  onTrack: boolean
}

interface Props {
  group: { id: string; name: string } | null
  currentUserId: string
  challenges: ChallengeView[]
  needsMigration: boolean
}

const LENGTHS = [7, 14, 30] as const
// Quick-pick templates shown on the empty state — one per supported category.
const EMPTY_TEMPLATES: ChallengeMetric[] = ['log_days', 'water_days', 'active_days', 'protein_days']

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysKey(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function medal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
}
function statusPill(c: ChallengeView, tc: ChallengesStrings): { text: string; cls: string } {
  if (c.status === 'upcoming') return { text: tc.statusStartsSoon, cls: 'bg-stone-800 text-stone-400' }
  if (c.status === 'ended') {
    return c.me?.done
      ? { text: tc.statusCompleted, cls: 'bg-amber-900/60 text-amber-300' }
      : { text: tc.statusEnded, cls: 'bg-stone-800 text-stone-400' }
  }
  if (c.me?.done) return { text: tc.statusComplete, cls: 'bg-amber-900/60 text-amber-300' }
  if (c.onTrack) return { text: tc.statusOnTrack, cls: 'bg-emerald-900/60 text-emerald-300' }
  return { text: tc.statusCatchUp, cls: 'bg-orange-900/50 text-orange-300' }
}

// One-tap cheer to a teammate. Reuses /api/cheer (push + in-app notification).
function CheerButton({ userId, reactionId, idle }: {
  userId: string; reactionId: string; idle: string
}) {
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  async function send() {
    if (state !== 'idle') return
    setState('sending')
    try {
      const res = await fetch('/api/cheer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reactionId }),
      })
      setState(res.ok ? 'sent' : 'idle')
    } catch {
      setState('idle')
    }
  }
  return (
    <button
      onClick={send}
      disabled={state !== 'idle'}
      className={`shrink-0 inline-flex items-center justify-center min-h-9 px-2.5 rounded-full text-xs font-medium transition-colors ${
        state === 'sent'
          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40'
          : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
      } disabled:opacity-70`}
      aria-label={state === 'sent' ? t.challenges.cheerSent : idle}
    >
      {state === 'sent' ? t.challenges.sent : state === 'sending' ? '…' : idle}
    </button>
  )
}

export default function ChallengesClient({ group, currentUserId, challenges, needsMigration }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()
  const tc = t.challenges

  const [showForm, setShowForm] = useState(false)
  const [metric, setMetric] = useState<ChallengeMetric>('log_days')
  const [length, setLength] = useState<7 | 14 | 30>(7)
  const [goal, setGoal] = useState(7)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fire `challenge_completed` once per completed challenge (deduped per device).
  useEffect(() => {
    for (const c of challenges) {
      if (!c.me?.done) continue
      const key = `ns_chal_done_${c.id}`
      try {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, '1')
          track('challenge_completed', { metric: c.metric })
        }
      } catch { /* ignore */ }
    }
  }, [challenges])

  function selectMetric(m: ChallengeMetric) {
    setMetric(m)
    setGoal(suggestedGoal(m, length))
    if (!title.trim() || Object.values(tc.metrics).some(v => v.label === title)) {
      setTitle(tc.metrics[m].label)
    }
  }
  function selectLength(l: 7 | 14 | 30) {
    setLength(l)
    setGoal(suggestedGoal(metric, l))
  }
  function openForm(m: ChallengeMetric = 'log_days') {
    setMetric(m)
    setLength(7)
    setGoal(suggestedGoal(m, 7))
    setTitle(tc.metrics[m].label)
    setError('')
    setShowForm(true)
  }

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (!group) return
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('challenges').insert({
      group_id: group.id,
      created_by: currentUserId,
      title: title.trim() || tc.metrics[metric].label,
      metric,
      goal,
      start_date: todayKey(),
      end_date: addDaysKey(length - 1),
    })
    setSaving(false)
    if (insErr) {
      setError(/challenges_metric_check/.test(insErr.message)
        ? tc.migrationError
        : insErr.message)
      return
    }
    track('challenge_created', { metric, length })
    setShowForm(false)
    setTitle('')
    router.refresh()
  }

  async function deleteChallenge(id: string) {
    await supabase.from('challenges').delete().eq('id', id)
    router.refresh()
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="px-4 pt-safe pb-4">
          <h1 className="text-white text-2xl font-bold">{tc.title}</h1>
        </div>
        <div className="mx-4 text-center py-12 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-stone-300 font-medium">{tc.joinGroupTitle}</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">{tc.joinGroupBody}</p>
          <div className="flex gap-2 justify-center">
            <Link href="/group/create" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">{tc.createGroup}</Link>
            <Link href="/group/join" className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold px-4 py-2.5 rounded-xl">{tc.joinGroup}</Link>
          </div>
        </div>
        <BottomNav active="challenges" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-4 pt-safe pb-4 flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> {group.name}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{tc.title}</h1>
        </div>
        {!showForm && challenges.length > 0 && (
          <button
            onClick={() => openForm('log_days')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} /> {tc.newButton}
          </button>
        )}
      </div>

      {needsMigration && (
        <div className="mx-4 mb-4 bg-amber-950/50 border border-amber-700/50 rounded-2xl px-4 py-3">
          <p className="text-amber-300 text-sm font-semibold">{tc.needsSetupTitle}</p>
          <p className="text-amber-500/90 text-xs mt-0.5">{tc.needsSetupBody}</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={createChallenge} className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm">{tc.newChallenge}</p>
            <button type="button" onClick={() => setShowForm(false)} aria-label={tc.close} className="flex items-center justify-center w-11 h-11 -mr-1 text-stone-400 hover:text-white"><X size={18} /></button>
          </div>

          {/* Metric, grouped by category */}
          <div className="space-y-3">
            {CHALLENGE_CATEGORIES.map(cat => {
              const metrics = (Object.keys(CHALLENGE_METRICS) as ChallengeMetric[]).filter(m => CHALLENGE_METRICS[m].category === cat)
              return (
                <div key={cat}>
                  <p className="text-stone-500 text-[11px] font-semibold uppercase tracking-wide mb-1.5">{tc.categories[cat]}</p>
                  <div className="space-y-2">
                    {metrics.map(m => {
                      const meta = CHALLENGE_METRICS[m]
                      const mt = tc.metrics[m]
                      return (
                        <button
                          type="button"
                          key={m}
                          onClick={() => selectMetric(m)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                            metric === m ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-800/50 hover:border-stone-500'
                          }`}
                        >
                          <span className="text-xl" aria-hidden="true">{meta.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${metric === m ? 'text-white' : 'text-stone-300'}`}>{mt.label}</p>
                            <p className="text-stone-400 text-xs">{tc.eachDay(mt.description)}</p>
                          </div>
                          {metric === m && <span className="text-emerald-400" aria-hidden="true">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Length + goal */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-stone-400 text-xs mb-1.5 block">{tc.length}</label>
              <div role="tablist" aria-label={tc.length} className="flex bg-stone-800 rounded-xl p-1">
                {LENGTHS.map(l => (
                  <button type="button" key={l} role="tab" aria-selected={length === l} onClick={() => selectLength(l)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${length === l ? 'bg-stone-100 text-stone-900' : 'text-stone-400'}`}>
                    {tc.lengthDays(l)}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-24">
              <label className="text-stone-400 text-xs mb-1.5 block">{tc.goalDaysLabel}</label>
              <input type="number" min={1} max={length} value={goal}
                onChange={e => setGoal(Math.max(1, Math.min(length, Number(e.target.value) || 1)))}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs mb-1.5 block">{tc.titleLabel}</label>
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))}
              placeholder={tc.metrics[metric].label}
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div className="bg-stone-800/50 rounded-xl px-3 py-2.5 space-y-1">
            <p className="text-stone-400 text-xs">
              🎯 {tc.metrics[metric].description}{tc.onWord}<span className="text-stone-200">{goal}</span>{tc.ofDaysSuffix(length)}
            </p>
            <p className="text-stone-400 text-xs">
              🎁 {tc.rewardWord}: <span className="text-amber-300">{CHALLENGE_METRICS[metric].reward.emoji} {tc.metrics[metric].reward}</span>
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {saving ? tc.creating : tc.startChallenge}
          </button>
        </form>
      )}

      {/* Empty state — template quick-picks */}
      {challenges.length === 0 && !showForm && (
        <div className="mx-4 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl p-5 text-center">
          <p className="text-4xl mb-2">🏁</p>
          <p className="text-white font-semibold">{tc.emptyTitle}</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">{tc.emptyBody}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {EMPTY_TEMPLATES.map(m => {
              const meta = CHALLENGE_METRICS[m]
              return (
                <button key={m} onClick={() => openForm(m)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-stone-700 bg-stone-800/50 hover:border-emerald-500 hover:bg-emerald-900/20 transition-colors text-left">
                  <span className="text-xl" aria-hidden="true">{meta.emoji}</span>
                  <span className="text-stone-200 text-xs font-medium">{tc.metrics[m].label}</span>
                </button>
              )
            })}
          </div>
          <button onClick={() => openForm('log_days')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-3 rounded-xl transition-colors">
            {tc.createChallenge}
          </button>
        </div>
      )}

      <div className="px-4 space-y-3">
        {challenges.map(c => {
          const meta = CHALLENGE_METRICS[c.metric]
          const mt = tc.metrics[c.metric]
          const pill = statusPill(c, tc)
          const maxProgress = Math.max(c.goal, ...c.leaderboard.map(l => l.progress), 1)
          const mePct = c.me ? Math.min(100, Math.round((c.me.progress / c.goal) * 100)) : 0
          return (
            <div key={c.id} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
              {/* Section 10: Milestone banner */}
              {c.banner && (
                <div className="bg-gradient-to-r from-amber-900/50 to-emerald-900/30 border-b border-amber-800/30 px-4 py-2 text-amber-200 text-xs font-medium">
                  {c.banner}
                </div>
              )}

              <div className="p-4 space-y-3">
                {/* Section 1: Header */}
                <div className="flex items-start gap-2">
                  <span className="text-2xl" aria-hidden="true">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-semibold text-sm">{c.title}</h2>
                    <p className="text-stone-400 text-xs">{tc.dayOf(c.dayIndex, c.totalDays)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pill.cls}`}>{pill.text}</span>
                    {c.created_by === currentUserId && (
                      <button onClick={() => deleteChallenge(c.id)} aria-label={tc.deleteAria} className="text-stone-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-stone-500 text-xs -mt-1">
                  {c.status === 'active' ? tc.remaining(c.remaining) : c.status === 'upcoming' ? tc.notStarted : tc.challengeEnded}
                </p>

                {/* Section 2: Goal + Section 3: Reward */}
                <div className="bg-stone-800/40 rounded-xl px-3 py-2.5 space-y-1.5">
                  <p className="text-stone-300 text-xs">
                    <span className="text-stone-500">{tc.goalWord}</span> — {mt.description}{tc.onWord}{c.goal}{tc.ofDaysSuffix(c.totalDays)}
                  </p>
                  <p className="text-stone-300 text-xs">
                    <span className="text-stone-500">{tc.rewardWord}</span> — <span className="text-amber-300">{meta.reward.emoji} {mt.reward}</span>
                  </p>
                </div>

                {/* Section 4: Crew Progress */}
                <div className="bg-stone-800/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-stone-300 text-xs font-medium">{tc.crewProgress}</span>
                    <span className="text-white text-sm font-bold tabular-nums">{c.teamPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-700 overflow-hidden" role="progressbar" aria-valuenow={c.teamPct} aria-valuemin={0} aria-valuemax={100} aria-label={tc.crewAria}>
                    <div
                      className={`h-full rounded-full transition-all ${c.teamPct >= 100 ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                      style={{ width: `${Math.max(2, c.teamPct)}%` }}
                    />
                  </div>
                  <p className="text-stone-400 text-[11px] mt-1.5 tabular-nums">{tc.unitsCompleted(c.teamProgress, c.teamGoal, mt.unit)}</p>
                </div>

                {/* Section 5: My Progress */}
                {c.me && (
                  <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-emerald-300 text-xs font-semibold">{tc.yourProgress}</span>
                      {c.me.streak > 0 && <span className="text-orange-300 text-xs">{tc.dayStreak(c.me.streak)}</span>}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{c.me.name}</span>
                      <span className="text-stone-300 text-xs tabular-nums">
                        {c.me.done && <span className="text-emerald-400 mr-1">✓</span>}{tc.progressDays(c.me.progress, c.goal)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-700 overflow-hidden" role="progressbar" aria-valuenow={mePct} aria-valuemin={0} aria-valuemax={100} aria-label={tc.yourProgressAria}>
                      <div className={`h-full rounded-full ${c.me.done ? 'bg-emerald-400' : 'bg-emerald-500'}`} style={{ width: `${Math.max(2, mePct)}%` }} />
                    </div>
                  </div>
                )}

                {/* Section 6: Leaderboard */}
                <div>
                  <p className="text-stone-400 text-[11px] font-semibold uppercase tracking-wide mb-2">{tc.leaderboard}</p>
                  <div className="space-y-2">
                    {c.leaderboard.map(row => {
                      const pct = Math.min(100, Math.round((row.progress / maxProgress) * 100))
                      const isMe = row.userId === currentUserId
                      return (
                        <div key={row.userId} className="flex items-center gap-2">
                          <span className="w-6 text-center text-xs shrink-0 tabular-nums" aria-label={tc.rankAria(row.rank)}>{medal(row.rank)}</span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${isMe ? 'bg-emerald-700 text-white' : 'bg-stone-700 text-stone-300'}`}>
                            {row.avatarUrl
                              ? <img src={row.avatarUrl} alt={row.name} className="w-full h-full object-cover" />
                              : (row.name[0]?.toUpperCase() ?? '?')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-xs truncate ${isMe ? 'text-emerald-300 font-medium' : 'text-stone-300'}`}>
                                {row.name}{isMe ? tc.you : ''}
                              </span>
                              <span className="text-stone-400 text-xs shrink-0 ml-2 tabular-nums">
                                {row.done && <span className="text-emerald-400 mr-1">✓</span>}{row.progress}/{c.goal}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-stone-700 overflow-hidden">
                              <div className={`h-full rounded-full ${row.done ? 'bg-emerald-500' : 'bg-emerald-600/60'}`} style={{ width: `${Math.max(2, pct)}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Section 7: Today's Accountability + Section 9: Quick actions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-stone-400 text-[11px] font-semibold uppercase tracking-wide">{tc.todayStatus}</p>
                    <span className="text-stone-500 text-[11px] tabular-nums">{tc.doneCount(c.todayCount, c.participantCount)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {c.leaderboard.map(row => {
                      const isMe = row.userId === currentUserId
                      return (
                        <div key={row.userId} className="flex items-center gap-2 text-xs">
                          <span aria-hidden="true">{row.todayDone ? '✅' : '⬜'}</span>
                          <span className={`flex-1 min-w-0 truncate ${row.todayDone ? 'text-stone-200' : 'text-stone-500'}`}>
                            {row.name}{isMe ? tc.you : ''} {row.todayDone ? tc.loggedWord : tc.notYet}
                          </span>
                          {!isMe && c.status === 'active' && (
                            row.todayDone
                              ? <CheerButton userId={row.userId} reactionId="nice_job" idle={tc.cheer} />
                              : <CheerButton userId={row.userId} reactionId="you_got_this" idle={tc.nudge} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Section 8: Challenge activity feed */}
                {c.feed.length > 0 && (
                  <div>
                    <p className="text-stone-400 text-[11px] font-semibold uppercase tracking-wide mb-2">{tc.recentActivity}</p>
                    <ul className="space-y-1">
                      {c.feed.map((ev, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-stone-300">
                          <span aria-hidden="true">{ev.emoji}</span>
                          <span className="min-w-0">{ev.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav active="challenges" />
    </div>
  )
}
