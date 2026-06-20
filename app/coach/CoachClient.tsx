'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ChevronRight, EyeOff, Sparkles, Crown, Bell, Send, TrendingUp } from 'lucide-react'
import { BottomNav } from '../dashboard/DashboardClient'
import CoachStyleSetting from './CoachStyleSetting'
import { SEVERITY_STYLE, type Severity, type GroupIntel } from '@/lib/coach-intel'
import type { AttentionLevel } from '@/lib/copilot'

export interface CoachGroup { id: string; name: string; plan: 'free' | 'coach'; memberCap: number; memberCount: number }

export interface RosterMember {
  user_id: string
  group_id: string
  display_name: string
  avatar_url: string | null
  attention: AttentionLevel
  streak: number
  daysLogged: number
  caloriesAvg: number
  calorieTarget: number
  nutrientsOnTrack: number
  nutrientsTotal: number
  topSignal: string | null
  severity: Severity
  priority: number
  primaryIssue: string
}

const SEV_LABEL: Record<Severity, string> = { critical: 'Critical', high: 'High', watch: 'Watch', good: 'Healthy' }
const CATEGORIES: { key: 'all' | Severity; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'watch', label: 'Watch' },
  { key: 'good', label: 'Healthy' },
]

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function CoachClient({
  groups, members, hiddenCount, pendingDrafts, coachId, coachStyle, group, mealsToday, checkinsSent,
}: {
  groups: CoachGroup[]; members: RosterMember[]; hiddenCount: number; pendingDrafts: number
  coachId: string; coachStyle: string | null
  group?: GroupIntel | null; mealsToday?: number; checkinsSent?: number
}) {
  const [cat, setCat] = useState<'all' | Severity>('all')
  const cappedFreeGroup = groups.find(g => g.plan === 'free' && g.memberCount >= g.memberCap)
  // Members arrive pre-sorted by priority from the server.
  const needs = members.filter(m => m.severity !== 'good').length
  const shown = cat === 'all' ? members : members.filter(m => m.severity === cat)

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href="/profile" aria-label="Back to profile" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Coach</h1>
          <p className="text-stone-400 text-xs">{groups.map(g => g.name).join(' · ') || 'Your group'}</p>
        </div>
      </header>

      {members.length === 0 ? (
        <>
          <CoachStyleSetting userId={coachId} initial={coachStyle} />
          <div className="px-4 mt-10 text-center">
            <p className="text-5xl mb-3">🧑‍🏫</p>
            <p className="text-stone-200 font-semibold">No members to coach yet</p>
            <p className="text-stone-400 text-sm mt-1">Invite people to your group and they&apos;ll show up here.</p>
          </div>
        </>
      ) : (
        <>
          {/* Daily overview banner */}
          {needs > 0 && (
            <div className="px-4 mb-3">
              <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/50 rounded-2xl px-4 py-3">
                <Bell size={18} className="text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-100 text-sm font-semibold">
                    {needs} client{needs === 1 ? '' : 's'} need{needs === 1 ? 's' : ''} a check-in today
                  </p>
                  <p className="text-amber-200/70 text-xs mt-0.5">Tap a flagged client to review their week and draft a check-in.</p>
                </div>
              </div>
            </div>
          )}

          {group && (
            <>
              {/* Daily overview — severity counts + today's signals */}
              <section className="px-4 mb-3">
                <div className="grid grid-cols-4 gap-2">
                  <OverviewStat label="Critical" value={group.counts.critical} tone="text-red-400" />
                  <OverviewStat label="High" value={group.counts.high} tone="text-orange-400" />
                  <OverviewStat label="Watch" value={group.counts.watch} tone="text-amber-300" />
                  <OverviewStat label="Healthy" value={group.counts.healthy} tone="text-emerald-400" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <OverviewStat label="Meals today" value={mealsToday ?? 0} tone="text-stone-200" />
                  <OverviewStat label="Hydration" value={`${group.hydrationCompliancePct}%`} tone="text-sky-300" />
                  <OverviewStat label="Check-ins" value={checkinsSent ?? 0} tone="text-stone-200" />
                </div>
              </section>

              {/* Group health score */}
              <section className="px-4 mb-3">
                <div className="bg-gradient-to-br from-emerald-950/40 to-stone-900 border border-emerald-900/40 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-stone-300 text-sm font-semibold">Group health score</p>
                    <span className="text-stone-400 text-xs">{group.healthLabel}</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-white text-4xl font-extrabold tabular-nums leading-none">{group.healthScore}</p>
                    <span className="text-stone-500 text-sm mb-1">/ 100</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-800 overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${group.healthScore >= 60 ? 'bg-emerald-500' : group.healthScore >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                      style={{ width: `${group.healthScore}%` }} />
                  </div>
                </div>
              </section>

              {/* AI insights */}
              {group.insights.length > 0 && (
                <section className="px-4 mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={13} className="text-emerald-400" />
                    <p className="text-stone-400 text-xs uppercase tracking-wider">AI insights</p>
                  </div>
                  <ul className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800">
                    {group.insights.map((t, i) => (
                      <li key={i} className="px-4 py-2.5 text-stone-200 text-sm">{t}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {/* Review queue actions + growth */}
          <div className="px-4 mb-3 space-y-2">
            {pendingDrafts > 0 && (
              <Link
                href="/coach/queue"
                className="flex items-center justify-between bg-emerald-900/30 border border-emerald-800/50 rounded-2xl px-4 py-3 hover:bg-emerald-900/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-emerald-200 text-sm font-semibold">
                  <Sparkles size={15} /> {pendingDrafts} check-in{pendingDrafts === 1 ? '' : 's'} ready to review
                </span>
                <span className="text-emerald-400 text-xs">Open queue →</span>
              </Link>
            )}
            {cappedFreeGroup && (
              <div className="flex items-center gap-2 bg-stone-900 border border-amber-900/40 rounded-2xl px-4 py-3">
                <Crown size={15} className="text-amber-400 shrink-0" />
                <span className="text-stone-300 text-xs">
                  “{cappedFreeGroup.name}” is full at {cappedFreeGroup.memberCap}. The coach plan unlocks a larger roster.
                </span>
              </div>
            )}
          </div>

          {/* Client categories + review queue */}
          <div className="px-4 flex items-center gap-1.5 mb-2 overflow-x-auto">
            {CATEGORIES.map(c => {
              const count = c.key === 'all' ? members.length : members.filter(m => m.severity === c.key).length
              return (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    cat === c.key ? 'bg-stone-100 text-stone-900 border-stone-100' : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-500'
                  }`}
                >
                  {c.label} {count}
                </button>
              )
            })}
          </div>

          <ul className="px-4 space-y-2">
            {shown.map(m => {
              const s = SEVERITY_STYLE[m.severity]
              return (
                <li key={`${m.group_id}:${m.user_id}`} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                  <Link href={`/coach/${m.user_id}`} className="flex items-center gap-3 p-3 hover:bg-stone-800/40 transition-colors">
                    <div className="relative shrink-0">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                        : <div className="w-11 h-11 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-300 text-sm font-semibold">{initials(m.display_name)}</div>}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-stone-900 ${s.dot}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{m.display_name}</p>
                        <span className={`shrink-0 text-[10px] font-semibold ${s.text}`}>{SEV_LABEL[m.severity]}</span>
                      </div>
                      <p className="text-stone-400 text-xs truncate mt-0.5">{m.primaryIssue}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-stone-200 text-sm font-semibold tabular-nums">{m.streak}🔥</p>
                      <ChevronRight size={16} className="text-stone-500 ml-auto" />
                    </div>
                  </Link>
                  {/* Quick actions */}
                  <div className="flex border-t border-stone-800 divide-x divide-stone-800">
                    <Link href={`/coach/${m.user_id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-stone-300 hover:text-white hover:bg-stone-800/50 text-xs font-medium transition-colors">
                      <TrendingUp size={13} /> Review
                    </Link>
                    <Link href={`/coach/${m.user_id}#copilot`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-stone-300 hover:text-white hover:bg-stone-800/50 text-xs font-medium transition-colors">
                      <Send size={13} /> Message
                    </Link>
                    <Link href={`/coach/${m.user_id}#copilot`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-emerald-300 hover:text-emerald-200 hover:bg-stone-800/50 text-xs font-medium transition-colors">
                      <Sparkles size={13} /> AI Draft
                    </Link>
                  </div>
                </li>
              )
            })}
            {shown.length === 0 && (
              <li className="text-center text-stone-500 text-sm py-8">No {cat !== 'all' ? SEV_LABEL[cat as Severity].toLowerCase() : ''} clients.</li>
            )}
          </ul>

          {hiddenCount > 0 && (
            <p className="px-4 mt-4 text-stone-500 text-xs flex items-center gap-1.5">
              <EyeOff size={13} /> {hiddenCount} member{hiddenCount === 1 ? '' : 's'} opted out of coach view.
            </p>
          )}

          <div className="px-4 mt-4">
            <CoachStyleSetting userId={coachId} initial={coachStyle} />
          </div>
        </>
      )}

      <BottomNav active="coach" />
    </div>
  )
}

function OverviewStat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl px-2 py-2.5 text-center">
      <p className={`text-xl font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="text-stone-500 text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}
