'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Plus, X, Trash2, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '../dashboard/DashboardClient'
import {
  CHALLENGE_METRICS, challengeStatus, daysRemaining, suggestedGoal,
  type ChallengeMetric,
} from '@/lib/challenges'

export interface LeaderRow {
  userId: string
  name: string
  avatarUrl: string | null
  progress: number
  done: boolean
}

export interface ChallengeView {
  id: string
  title: string
  metric: ChallengeMetric
  goal: number
  start_date: string
  end_date: string
  created_by: string
  leaderboard: LeaderRow[]
  teamProgress: number   // Σ each member's progress capped at the goal
  teamGoal: number       // goal × member count
}

interface Props {
  group: { id: string; name: string } | null
  currentUserId: string
  challenges: ChallengeView[]
  needsMigration: boolean
}

const METRIC_KEYS = Object.keys(CHALLENGE_METRICS) as ChallengeMetric[]
const LENGTHS = [7, 14, 30] as const

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysKey(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ChallengesClient({ group, currentUserId, challenges, needsMigration }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [showForm, setShowForm] = useState(false)
  const [metric, setMetric] = useState<ChallengeMetric>('log_days')
  const [length, setLength] = useState<7 | 14 | 30>(7)
  const [goal, setGoal] = useState(7)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function selectMetric(m: ChallengeMetric) {
    setMetric(m)
    setGoal(suggestedGoal(m, length))
    if (!title.trim()) setTitle(CHALLENGE_METRICS[m].label)
  }
  function selectLength(l: 7 | 14 | 30) {
    setLength(l)
    setGoal(suggestedGoal(metric, l))
  }

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (!group) return
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('challenges').insert({
      group_id: group.id,
      created_by: currentUserId,
      title: title.trim() || CHALLENGE_METRICS[metric].label,
      metric,
      goal,
      start_date: todayKey(),
      end_date: addDaysKey(length - 1),
    })
    setSaving(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
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
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-white text-2xl font-bold">Challenges</h1>
        </div>
        <div className="mx-4 text-center py-12 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-stone-300 font-medium">Join a group to start challenges</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">Challenges keep your crew accountable together.</p>
          <div className="flex gap-2 justify-center">
            <Link href="/group/create" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl">Create group</Link>
            <Link href="/group/join" className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold px-4 py-2.5 rounded-xl">Join group</Link>
          </div>
        </div>
        <BottomNav active="challenges" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-stone-400 text-sm flex items-center gap-1.5"><Trophy size={13} className="text-amber-400" /> {group.name}</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">Challenges</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => { selectMetric('log_days'); setShowForm(true) }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} /> New
          </button>
        )}
      </div>

      {needsMigration && (
        <div className="mx-4 mb-4 bg-amber-950/50 border border-amber-700/50 rounded-2xl px-4 py-3">
          <p className="text-amber-300 text-sm font-semibold">Challenges need a quick setup</p>
          <p className="text-amber-500/90 text-xs mt-0.5">Apply migration 009 in Supabase to enable group challenges.</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={createChallenge} className="mx-4 mb-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm">New challenge</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-stone-400 hover:text-white"><X size={18} /></button>
          </div>

          {/* Metric */}
          <div className="space-y-2">
            {METRIC_KEYS.map(m => {
              const meta = CHALLENGE_METRICS[m]
              return (
                <button
                  type="button"
                  key={m}
                  onClick={() => selectMetric(m)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    metric === m ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-800/50 hover:border-stone-500'
                  }`}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${metric === m ? 'text-white' : 'text-stone-300'}`}>{meta.label}</p>
                    <p className="text-stone-400 text-xs">{meta.description}</p>
                  </div>
                  {metric === m && <span className="text-emerald-400">✓</span>}
                </button>
              )
            })}
          </div>

          {/* Length + goal */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-stone-400 text-xs mb-1.5 block">Length</label>
              <div className="flex bg-stone-800 rounded-xl p-1">
                {LENGTHS.map(l => (
                  <button type="button" key={l} onClick={() => selectLength(l)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${length === l ? 'bg-stone-600 text-white' : 'text-stone-400'}`}>
                    {l}d
                  </button>
                ))}
              </div>
            </div>
            <div className="w-24">
              <label className="text-stone-400 text-xs mb-1.5 block">Goal ({CHALLENGE_METRICS[metric].unit.split(' ')[0]})</label>
              <input type="number" min={1} max={length} value={goal}
                onChange={e => setGoal(Math.max(1, Math.min(length, Number(e.target.value) || 1)))}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs mb-1.5 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))}
              placeholder={CHALLENGE_METRICS[metric].label}
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>

          <p className="text-stone-400 text-xs">
            Goal: {CHALLENGE_METRICS[metric].description.toLowerCase()} on <span className="text-stone-300">{goal}</span> of {length} days.
          </p>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {saving ? 'Creating…' : 'Start challenge'}
          </button>
        </form>
      )}

      {/* Challenge list */}
      {challenges.length === 0 && !showForm && (
        <div className="mx-4 text-center py-12 bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl">
          <p className="text-4xl mb-3">🏁</p>
          <p className="text-stone-300 font-medium">No challenges yet</p>
          <p className="text-stone-400 text-sm mt-1">Start one to get your group moving together.</p>
        </div>
      )}

      <div className="px-4 space-y-3">
        {challenges.map(c => {
          const status = challengeStatus(c.start_date, c.end_date)
          const remaining = daysRemaining(c.end_date)
          const meta = CHALLENGE_METRICS[c.metric]
          const maxProgress = Math.max(c.goal, ...c.leaderboard.map(l => l.progress), 1)
          return (
            <div key={c.id} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{c.title}</p>
                    <p className="text-stone-400 text-xs">{meta.description} · goal: {c.goal} days</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      status === 'active' ? 'bg-emerald-900/60 text-emerald-300'
                      : status === 'upcoming' ? 'bg-stone-800 text-stone-400'
                      : 'bg-stone-800 text-stone-400'
                    }`}>
                      {status === 'active' ? `${remaining}d left` : status === 'upcoming' ? 'upcoming' : 'ended'}
                    </span>
                    {c.created_by === currentUserId && (
                      <button onClick={() => deleteChallenge(c.id)} aria-label="Delete challenge" className="text-stone-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Team combined goal */}
                {(() => {
                  const teamPct = Math.min(100, Math.round((c.teamProgress / c.teamGoal) * 100))
                  const teamDone = c.teamProgress >= c.teamGoal
                  return (
                    <div className="mt-3 bg-stone-800/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-stone-300 text-xs font-medium">🤝 Crew progress</span>
                        <span className="text-stone-400 text-xs tabular-nums">
                          {teamDone && <span className="text-amber-400 mr-1">🎉</span>}
                          {c.teamProgress} / {c.teamGoal} days
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${teamDone ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                          style={{ width: `${Math.max(2, teamPct)}%` }}
                        />
                      </div>
                    </div>
                  )
                })()}

                {/* Leaderboard */}
                <div className="mt-3 space-y-2">
                  {c.leaderboard.map((row, i) => {
                    const pct = Math.min(100, Math.round((row.progress / maxProgress) * 100))
                    const isMe = row.userId === currentUserId
                    const leading = i === 0 && row.progress > 0
                    return (
                      <div key={row.userId} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${
                          isMe ? 'bg-emerald-700 text-white' : 'bg-stone-700 text-stone-300'
                        }`}>
                          {row.avatarUrl
                            ? <img src={row.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : (row.name[0]?.toUpperCase() ?? '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs truncate ${isMe ? 'text-emerald-300 font-medium' : 'text-stone-300'}`}>
                              {row.name}{isMe ? ' (you)' : ''}
                              {leading && <Crown size={11} className="inline ml-1 text-amber-400 -mt-0.5" />}
                            </span>
                            <span className="text-stone-400 text-xs shrink-0 ml-2 tabular-nums">
                              {row.done && <span className="text-emerald-400 mr-1">✓</span>}
                              {row.progress}/{c.goal}
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
            </div>
          )
        })}
      </div>

      <BottomNav active="challenges" />
    </div>
  )
}
