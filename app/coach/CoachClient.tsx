'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ChevronRight, EyeOff, Sparkles, Crown, Bell, Send, TrendingUp } from 'lucide-react'
import { BottomNav } from '../dashboard/DashboardClient'
import CoachStyleSetting from './CoachStyleSetting'
import { SEVERITY_STYLE, type Severity, type GroupIntel } from '@/lib/coach-intel'
import type { AttentionLevel } from '@/lib/copilot'
import { useI18n } from '@/components/I18nProvider'
import type { Dict } from '@/lib/i18n/dictionaries'

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

function sevLabel(s: Severity, c: Dict['coach']): string {
  return s === 'critical' ? c.critical : s === 'high' ? c.high : s === 'watch' ? c.watch : c.healthy
}
function categories(c: Dict['coach']): { key: 'all' | Severity; label: string }[] {
  return [
    { key: 'all', label: c.all },
    { key: 'critical', label: c.critical },
    { key: 'high', label: c.high },
    { key: 'watch', label: c.watch },
    { key: 'good', label: c.healthy },
  ]
}

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
  const { t } = useI18n()
  const c = t.coach
  const CATEGORIES = categories(c)
  const [cat, setCat] = useState<'all' | Severity>('all')
  const cappedFreeGroup = groups.find(g => g.plan === 'free' && g.memberCount >= g.memberCap)
  // Members arrive pre-sorted by priority from the server.
  const needs = members.filter(m => m.severity !== 'good').length
  const shown = cat === 'all' ? members : members.filter(m => m.severity === cat)

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-safe pb-3 flex items-center gap-3">
        <Link href="/profile" aria-label={c.backToProfile} className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-stone-400 text-xs">{groups.map(g => g.name).join(' · ') || c.yourGroup}</p>
        </div>
      </header>

      {members.length === 0 ? (
        <>
          <CoachStyleSetting userId={coachId} initial={coachStyle} />
          <div className="px-4 mt-10 text-center">
            <p className="text-5xl mb-3">🧑‍🏫</p>
            <p className="text-stone-200 font-semibold">{c.noMembersTitle}</p>
            <p className="text-stone-400 text-sm mt-1">{c.noMembersBody}</p>
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
                    {c.needCheckin(needs)}
                  </p>
                  <p className="text-amber-200/70 text-xs mt-0.5">{c.needCheckinSub}</p>
                </div>
              </div>
            </div>
          )}

          {group && (
            <>
              {/* Daily overview — severity counts + today's signals */}
              <section className="px-4 mb-3">
                <div className="grid grid-cols-4 gap-2">
                  <OverviewStat label={c.critical} value={group.counts.critical} tone="text-red-400" />
                  <OverviewStat label={c.high} value={group.counts.high} tone="text-orange-400" />
                  <OverviewStat label={c.watch} value={group.counts.watch} tone="text-amber-300" />
                  <OverviewStat label={c.healthy} value={group.counts.healthy} tone="text-emerald-400" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <OverviewStat label={c.mealsToday} value={mealsToday ?? 0} tone="text-stone-200" />
                  <OverviewStat label={c.hydration} value={`${group.hydrationCompliancePct}%`} tone="text-sky-300" />
                  <OverviewStat label={c.checkins} value={checkinsSent ?? 0} tone="text-stone-200" />
                </div>
              </section>

              {/* Group health score */}
              <section className="px-4 mb-3">
                <div className="bg-gradient-to-br from-emerald-950/40 to-stone-900 border border-emerald-900/40 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-stone-300 text-sm font-semibold">{c.groupHealthScore}</p>
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
                    <p className="text-stone-400 text-xs uppercase tracking-wider">{c.aiInsights}</p>
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
                  <Sparkles size={15} /> {c.checkinsReady(pendingDrafts)}
                </span>
                <span className="text-emerald-400 text-xs">{c.openQueue}</span>
              </Link>
            )}
            {cappedFreeGroup && (
              <div className="flex items-center gap-2 bg-stone-900 border border-amber-900/40 rounded-2xl px-4 py-3">
                <Crown size={15} className="text-amber-400 shrink-0" />
                <span className="text-stone-300 text-xs">
                  {c.groupFull(cappedFreeGroup.name, cappedFreeGroup.memberCap)}
                </span>
              </div>
            )}
          </div>

          {/* Client categories + review queue */}
          <div role="tablist" aria-label={c.categoriesAria} className="px-4 flex items-center gap-1.5 mb-2 overflow-x-auto">
            {CATEGORIES.map(cat_ => {
              const count = cat_.key === 'all' ? members.length : members.filter(m => m.severity === cat_.key).length
              return (
                <button
                  key={cat_.key}
                  role="tab"
                  aria-selected={cat === cat_.key}
                  onClick={() => setCat(cat_.key)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    cat === cat_.key ? 'bg-stone-100 text-stone-900 border-stone-100' : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-500'
                  }`}
                >
                  {cat_.label} {count}
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
                        ? <img src={m.avatar_url} alt={m.display_name} className="w-11 h-11 rounded-full object-cover" />
                        : <div className="w-11 h-11 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-300 text-sm font-semibold">{initials(m.display_name)}</div>}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-stone-900 ${s.dot}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{m.display_name}</p>
                        <span className={`shrink-0 text-[10px] font-semibold ${s.text}`}>{sevLabel(m.severity, c)}</span>
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
                      <TrendingUp size={13} /> {c.review}
                    </Link>
                    <Link href={`/coach/${m.user_id}#copilot`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-stone-300 hover:text-white hover:bg-stone-800/50 text-xs font-medium transition-colors">
                      <Send size={13} /> {c.message}
                    </Link>
                    <Link href={`/coach/${m.user_id}#copilot`} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-emerald-300 hover:text-emerald-200 hover:bg-stone-800/50 text-xs font-medium transition-colors">
                      <Sparkles size={13} /> {c.aiDraft}
                    </Link>
                  </div>
                </li>
              )
            })}
            {shown.length === 0 && (
              <li className="text-center text-stone-500 text-sm py-8">
                {cat !== 'all' ? c.noClientsCategory(sevLabel(cat as Severity, c).toLowerCase()) : c.noClientsAll}
              </li>
            )}
          </ul>

          {hiddenCount > 0 && (
            <p className="px-4 mt-4 text-stone-500 text-xs flex items-center gap-1.5">
              <EyeOff size={13} /> {c.optedOut(hiddenCount)}
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
