'use client'

import { useEffect, useState } from 'react'
import { X, Flame, CalendarCheck, Target, Utensils, Dumbbell, UserMinus, ChevronDown, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { computeStreak } from '@/lib/streak'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { GOAL_LABELS, GOAL_EMOJIS, kgToLbs } from '@/lib/fitness'
import { ACTIVE_DAYS_GOAL } from '@/lib/weekly'
import { CHEER_REACTIONS } from '@/lib/reactions'
import type { Goal } from '@/types'

interface Achievement { emoji: string; text: string }

interface MiniData {
  goals: Goal[]
  lbsToGo: number | null
  streak: number
  daysThisWeek: number
  mealsThisWeek: number
  avatarUrl: string | null
  memberSince: string | null
  totalMeals: number
  todayMeals: string[]
  avgKcal: number | null
  kcalTarget: number | null
  activeDays: number
  photos: string[]
  achievement: Achievement | null
}

const localDay = (ts: string) => new Date(ts).toLocaleDateString('en-CA')

// The four daily slots shown in Today's Progress, in the order people eat them.
const MEAL_SLOTS: { type: string; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
]

// Turn the member's most recent milestone row into a single highlight. Falls
// back to thresholds derived from their stats when no milestone has posted.
function achievementFromMilestone(row: { type: string; data: Record<string, unknown> } | null): Achievement | null {
  if (!row) return null
  if (row.type === 'streak') {
    const days = Number(row.data?.days ?? 0)
    return days > 0 ? { emoji: '🔥', text: `Logged ${days} days straight` } : null
  }
  if (row.type === 'goal_weight') {
    const pct = Number(row.data?.pct ?? 0)
    return pct >= 100
      ? { emoji: '🏆', text: 'Reached their goal weight' }
      : { emoji: '🎯', text: `${pct}% of the way to goal weight` }
  }
  return null
}

function deriveAchievement(streak: number, totalMeals: number, activeDays: number, lbsToGo: number | null): Achievement | null {
  if (lbsToGo === 0) return { emoji: '🏆', text: 'Reached their goal weight' }
  for (const d of [30, 14, 10, 7, 3]) {
    if (streak >= d) return { emoji: '🔥', text: `Logged ${d} days straight` }
  }
  for (const m of [100, 50, 25, 10]) {
    if (totalMeals >= m) return { emoji: '🏆', text: `${m} meals logged` }
  }
  if (activeDays >= ACTIVE_DAYS_GOAL) return { emoji: '🏃', text: 'Active week complete' }
  return null
}

// Friendly, always-positive standing for the member within their group. Only
// surfaces a line when it's flattering; otherwise stays hidden.
function rankingHeadline(
  logsByUser: Map<string, string[]>,
  peerIds: string[],
  memberId: string,
  now: number,
): string | null {
  const m = peerIds.length
  if (m < 3) return null
  const weekAgo = now - 7 * 86400000
  const streaks = peerIds.map(id => ({ id, v: computeStreak(logsByUser.get(id) ?? []) }))
  const weekly = peerIds.map(id => ({
    id,
    v: (logsByUser.get(id) ?? []).filter(ts => new Date(ts).getTime() >= weekAgo).length,
  }))
  const myStreak = streaks.find(s => s.id === memberId)?.v ?? 0
  const streakRank = 1 + streaks.filter(s => s.v > myStreak).length
  const myWeekly = weekly.find(w => w.id === memberId)?.v ?? 0
  const beatenPct = Math.round((weekly.filter(w => w.v < myWeekly).length / m) * 100)

  if (myStreak > 0 && streakRank === 1) return '🏅 Longest current streak in the group'
  if (myWeekly > 0 && beatenPct >= 70) return `📊 More consistent than ${beatenPct}% of the group`
  if (myStreak > 0 && streakRank <= 3) return `🔥 Rank #${streakRank} in current streaks`
  return null
}

interface MiniProfileProps {
  userId: string
  name: string
  onClose: () => void
  // Founder moderation — present only when the viewer founded this member's group.
  moderation?: { groupId: string; groupName: string } | null
  onRemoveMember?: (userId: string) => Promise<void>
}

export default function MiniProfileModal({ userId, name, onClose, moderation = null, onRemoveMember }: MiniProfileProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(onClose)
  const [data, setData] = useState<MiniData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState<string | null>(null)
  // The label of the reaction we last sent, plus the send lifecycle state.
  const [sent, setSent] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [cheerError, setCheerError] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function removeMember() {
    if (!onRemoveMember) return
    setRemoving(true)
    try {
      await onRemoveMember(userId)
      onClose()
    } finally {
      setRemoving(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const sixtyAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    ;(async () => {
      const [
        { data: profile },
        { data: logs60 },
        { data: logs7 },
        { data: photoRows },
        { data: acts7 },
        { count: mealCount },
        { data: milestoneRows },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('food_logs').select('logged_at').eq('user_id', userId).gte('logged_at', sixtyAgo),
        supabase.from('food_logs').select('logged_at, meal_type, total_calories').eq('user_id', userId).gte('logged_at', weekAgo),
        supabase.from('food_logs').select('photo_url').eq('user_id', userId).not('photo_url', 'is', null)
          .order('logged_at', { ascending: false }).limit(6),
        // Readable once migration 021's group SELECT policy is applied; empty otherwise.
        supabase.from('activity_logs').select('logged_at, activity_name').eq('user_id', userId).gte('logged_at', weekAgo),
        supabase.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        // Group members can read each other's milestones (migration 029).
        supabase.from('milestones').select('type, data, created_at').eq('user_id', userId)
          .order('created_at', { ascending: false }).limit(1),
      ])

      const goals: Goal[] = (profile?.goals as Goal[] | null) ?? (profile?.goal ? [profile.goal as Goal] : [])
      const today = localDay(new Date().toISOString())
      const weekRows = (logs7 ?? []) as { logged_at: string; meal_type: string; total_calories: number }[]
      const todayMeals = [...new Set(weekRows.filter(l => localDay(l.logged_at) === today).map(l => l.meal_type))]
      const actRows = (acts7 ?? []) as { logged_at: string; activity_name: string }[]

      const loggedDays = new Set(weekRows.map(l => localDay(l.logged_at)))
      const totalKcal = weekRows.reduce((s, l) => s + (l.total_calories || 0), 0)
      const avgKcal = loggedDays.size ? Math.round(totalKcal / loggedDays.size) : null

      const weightKg = (profile?.weight_kg as number) ?? null
      const targetKg = (profile?.target_weight_kg as number) ?? null
      const lbsToGo = weightKg && targetKg ? Math.round(Math.abs(kgToLbs(weightKg) - kgToLbs(targetKg))) : null

      const created = profile?.created_at ? new Date(profile.created_at as string) : null
      const memberSince = created
        ? created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : null

      const streak = computeStreak((logs60 ?? []).map(l => l.logged_at as string))
      const activeDays = new Set(actRows.map(a => localDay(a.logged_at))).size
      const totalMeals = mealCount ?? 0
      const milestone = ((milestoneRows ?? []) as { type: string; data: Record<string, unknown> }[])[0] ?? null

      setData({
        goals,
        lbsToGo,
        streak,
        daysThisWeek: loggedDays.size,
        mealsThisWeek: weekRows.length,
        avatarUrl: (profile?.avatar_url as string) ?? null,
        memberSince,
        totalMeals,
        todayMeals,
        avgKcal,
        kcalTarget: (profile?.calorie_target as number) ?? null,
        activeDays,
        photos: ((photoRows ?? []) as { photo_url: string }[])
          .map(r => r.photo_url)
          .filter(u => !!u && !u.startsWith('blob:'))
          .slice(0, 3),
        achievement: achievementFromMilestone(milestone) ?? deriveAchievement(streak, totalMeals, activeDays, lbsToGo),
      })
      setLoading(false)
    })()
  }, [userId])

  // Group ranking loads separately so it never blocks the main profile. The RPC
  // returns everyone who shares a group with the viewer (which includes this
  // member); we read their logs in one query to rank consistency + streaks.
  useEffect(() => {
    const supabase = createClient()
    const sixtyAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    ;(async () => {
      try {
        const { data: peerRows } = await supabase.rpc('get_my_group_member_ids')
        const peerIds = Array.isArray(peerRows)
          ? [...new Set((peerRows as unknown[]).map(r =>
              typeof r === 'string' ? r : (r as Record<string, string>)?.get_my_group_member_ids).filter(Boolean))]
          : []
        if (peerIds.length < 3 || !peerIds.includes(userId)) return
        const { data: peerLogs } = await supabase
          .from('food_logs').select('user_id, logged_at').in('user_id', peerIds).gte('logged_at', sixtyAgo)
        const byUser = new Map<string, string[]>()
        peerIds.forEach(id => byUser.set(id, []))
        ;((peerLogs ?? []) as { user_id: string; logged_at: string }[]).forEach(l => {
          byUser.get(l.user_id)?.push(l.logged_at)
        })
        setRanking(rankingHeadline(byUser, peerIds, userId, Date.now()))
      } catch {
        /* ranking is best-effort — never surface an error */
      }
    })()
  }, [userId])

  async function send(reactionId: string, label: string) {
    if (sending || sent) return
    setSending(true)
    setCheerError(false)
    try {
      const res = await fetch('/api/cheer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reactionId }),
      })
      if (res.ok) setSent(label)
      else setCheerError(true)
    } catch {
      setCheerError(true)
    } finally {
      setSending(false)
    }
  }

  // Dynamic primary CTA: streak → cheer it; else a recent achievement → celebrate;
  // else hasn't logged today → encourage; otherwise a plain cheer.
  const cta = (() => {
    if (!data) return { label: `👏 Cheer ${name} on`, reactionId: 'nice_job' }
    if (data.streak >= 2) return { label: `🔥 Cheer ${name}'s ${data.streak}-day streak`, reactionId: 'keep_going' }
    if (data.achievement) return { label: `🎯 Celebrate ${name}'s progress`, reactionId: 'goal_crusher' }
    if (data.todayMeals.length === 0) return { label: `💪 Encourage ${name} to log today`, reactionId: 'you_got_this' }
    return { label: `👏 Cheer ${name} on`, reactionId: 'nice_job' }
  })()

  const goal = data?.goals[0] ?? null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={trapRef}
        tabIndex={-1}
        className="w-full max-w-xs bg-stone-900 border border-stone-700 rounded-3xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${name}'s profile`}
      >
        {/* ── Section 1: Header ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-5 pb-3 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden">
            {data?.avatarUrl
              ? <img src={data.avatarUrl} alt={name} className="w-full h-full object-cover" />
              : (name[0]?.toUpperCase() ?? '?')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg truncate">{name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data && data.streak > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-950/60 text-orange-300 border border-orange-800/50 px-2 py-0.5 rounded-full">
                  <span aria-hidden="true">🔥</span> {data.streak} day streak
                </span>
              )}
              {goal && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                  <span aria-hidden="true">{GOAL_EMOJIS[goal]}</span> {GOAL_LABELS[goal]}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-11 h-11 -mr-2 -mt-2 text-stone-400 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="space-y-3 pb-2" aria-label="Loading profile">
              <div className="h-24 bg-stone-800 rounded-xl animate-pulse" />
              <div className="h-20 bg-stone-800 rounded-xl animate-pulse" style={{ animationDelay: '80ms' }} />
              <div className="h-16 bg-stone-800 rounded-xl animate-pulse" style={{ animationDelay: '160ms' }} />
            </div>
          ) : data && (
            <div className="space-y-3 pb-3">
              {/* ── Section 2: Today's Progress ──────────────────────────────── */}
              <section aria-label="Today's progress" className="bg-stone-800/60 rounded-xl p-3">
                <h3 className="text-stone-400 text-[11px] font-semibold uppercase tracking-wide mb-2">Today&apos;s Progress</h3>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {MEAL_SLOTS.map(slot => {
                    const done = data.todayMeals.includes(slot.type)
                    return (
                      <li
                        key={slot.type}
                        className={`flex items-center gap-1.5 text-xs ${done ? 'text-emerald-300' : 'text-stone-500'}`}
                        aria-label={`${slot.label} ${done ? 'logged' : 'pending'}`}
                      >
                        <span aria-hidden="true">{done ? '✅' : '⬜'}</span>
                        <span>{slot.label}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              {/* ── Section 3: Progress Snapshot ─────────────────────────────── */}
              <section aria-label="Progress snapshot" className="bg-stone-800/60 rounded-xl p-3 space-y-1.5">
                <h3 className="text-stone-400 text-[11px] font-semibold uppercase tracking-wide mb-1">Progress Snapshot</h3>
                <div className="flex items-center gap-2 text-xs">
                  <Flame size={13} className="text-orange-400 shrink-0" aria-hidden="true" />
                  <span className="text-stone-200">{data.streak} day streak</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CalendarCheck size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="text-stone-200">Logged {data.mealsThisWeek} meal{data.mealsThisWeek === 1 ? '' : 's'} this week</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Utensils size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="text-stone-200">{data.totalMeals} meals total</span>
                </div>
              </section>

              {/* ── Section 4: Goal Progress ─────────────────────────────────── */}
              {(data.lbsToGo != null || data.avgKcal != null || data.activeDays > 0) && (
                <section aria-label="Goal progress" className="bg-stone-800/60 rounded-xl p-3 space-y-1.5">
                  <h3 className="text-stone-400 text-[11px] font-semibold uppercase tracking-wide mb-1">Goal Progress</h3>
                  {/* Privacy: distance to goal only — absolute weights are never shared. */}
                  {data.lbsToGo != null && (
                    <div className="flex items-center gap-2 text-xs">
                      <Target size={13} className="text-sky-400 shrink-0" aria-hidden="true" />
                      <span className="text-stone-200">
                        {data.lbsToGo === 0 ? 'At goal weight 🎉' : `${data.lbsToGo} lbs remaining`}
                      </span>
                    </div>
                  )}
                  {data.avgKcal != null && (
                    <div className="flex items-center gap-2 text-xs">
                      <Utensils size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
                      <span className="text-stone-200">
                        Average {data.avgKcal.toLocaleString()} kcal/day
                        {data.kcalTarget ? <span className="text-stone-400"> · goal {data.kcalTarget.toLocaleString()}</span> : null}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <Dumbbell size={13} className="text-orange-400 shrink-0" aria-hidden="true" />
                    <span className="text-stone-200">
                      {data.activeDays} active day{data.activeDays === 1 ? '' : 's'} this week
                      <span className="text-stone-400"> · goal {ACTIVE_DAYS_GOAL}</span>
                    </span>
                  </div>
                </section>
              )}

              {/* ── Section 5: Achievement Highlight ─────────────────────────── */}
              {data.achievement && (
                <section
                  aria-label={`Achievement: ${data.achievement.text}`}
                  className="flex items-center gap-2.5 bg-gradient-to-r from-amber-900/40 to-stone-800/40 border border-amber-800/40 rounded-xl px-3 py-2.5"
                >
                  <span className="text-xl shrink-0" aria-hidden="true">{data.achievement.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-amber-200 text-sm font-semibold leading-tight">{data.achievement.text}</p>
                    <p className="text-amber-400/70 text-[10px] uppercase tracking-wide">Achievement</p>
                  </div>
                </section>
              )}

              {/* ── Section 6: Recent Meals ──────────────────────────────────── */}
              {data.photos.length > 0 && (
                <section aria-label="Recent meals" className="grid grid-cols-3 gap-1.5">
                  {data.photos.map((url, i) => (
                    <img key={i} src={url} alt="Logged meal" loading="lazy" className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </section>
              )}

              {/* ── Section 7: Group Ranking ─────────────────────────────────── */}
              {ranking && (
                <section
                  aria-label={`Group ranking: ${ranking}`}
                  className="flex items-center gap-2 bg-sky-950/40 border border-sky-800/40 rounded-xl px-3 py-2 text-xs text-sky-200"
                >
                  <Trophy size={13} className="text-sky-400 shrink-0" aria-hidden="true" />
                  <span>{ranking}</span>
                </section>
              )}

              {/* ── Section 10: About (collapsible, low priority) ────────────── */}
              <div className="border-t border-stone-800 pt-1">
                <button
                  onClick={() => setAboutOpen(o => !o)}
                  aria-expanded={aboutOpen}
                  className="flex items-center justify-between w-full min-h-11 text-stone-400 hover:text-stone-200 text-xs font-medium transition-colors"
                >
                  <span>About</span>
                  <ChevronDown size={15} className={`transition-transform ${aboutOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {aboutOpen && (
                  <dl className="pb-1 space-y-1 text-xs">
                    {data.memberSince && (
                      <div className="flex justify-between">
                        <dt className="text-stone-500">Member since</dt>
                        <dd className="text-stone-300">{data.memberSince}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-stone-500">Meals logged</dt>
                      <dd className="text-stone-300">{data.totalMeals}</dd>
                    </div>
                  </dl>
                )}
              </div>

              {/* Founder-only: remove this member from the group */}
              {moderation && onRemoveMember && (
                <div className="border-t border-stone-800 pt-1">
                  {confirmRemove ? (
                    <div className="pt-2 space-y-2">
                      <p className="text-stone-300 text-xs">
                        Remove <span className="text-white font-medium">{name}</span> from {moderation.groupName}? They&apos;ll lose access to the group feed.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={removeMember}
                          disabled={removing}
                          className="flex-1 bg-red-900/70 hover:bg-red-900 text-red-100 text-xs font-semibold min-h-11 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {removing ? 'Removing…' : 'Remove'}
                        </button>
                        <button
                          onClick={() => setConfirmRemove(false)}
                          disabled={removing}
                          className="flex-1 text-stone-300 hover:text-white text-xs min-h-11 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(true)}
                      className="flex items-center gap-1.5 text-stone-500 hover:text-red-300 text-xs font-medium min-h-11 transition-colors"
                    >
                      <UserMinus size={13} aria-hidden="true" /> Remove from group
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sections 8 + 9: Quick Reactions + sticky primary CTA ──────────── */}
        {!loading && (
          <div className="shrink-0 border-t border-stone-800 p-5 pt-3 space-y-2.5">
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5">
              {CHEER_REACTIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => send(r.id, r.label)}
                  disabled={sending || !!sent}
                  aria-label={`Send ${r.label} reaction`}
                  className="shrink-0 inline-flex items-center gap-1 min-h-11 px-3 rounded-full text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors disabled:opacity-50"
                >
                  <span aria-hidden="true">{r.emoji}</span> {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => send(cta.reactionId, cta.label)}
              disabled={sending || !!sent}
              className={`w-full min-h-11 py-3 rounded-xl text-sm font-semibold transition-colors ${
                sent
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60'
              }`}
            >
              {sent ? `✓ Sent “${sent}”` : sending ? 'Sending…' : cheerError ? 'Try again' : cta.label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
