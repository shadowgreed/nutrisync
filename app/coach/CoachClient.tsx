'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, EyeOff, Sparkles, Crown, Bell } from 'lucide-react'
import { BottomNav } from '../dashboard/DashboardClient'
import CoachStyleSetting from './CoachStyleSetting'
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
}

const ATTENTION_META: Record<AttentionLevel, { label: string; dot: string; chip: string; order: number }> = {
  needs_attention: { label: 'Needs attention', dot: 'bg-red-400',    chip: 'bg-red-900/50 text-red-200 border-red-800/60',          order: 0 },
  watch:           { label: 'Worth a look',     dot: 'bg-amber-400',  chip: 'bg-amber-900/40 text-amber-200 border-amber-800/60',    order: 1 },
  on_track:        { label: 'On track',         dot: 'bg-emerald-400',chip: 'bg-emerald-900/40 text-emerald-200 border-emerald-800/60', order: 2 },
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function CoachClient({
  groups, members, hiddenCount, pendingDrafts, coachId, coachStyle,
}: {
  groups: CoachGroup[]; members: RosterMember[]; hiddenCount: number; pendingDrafts: number
  coachId: string; coachStyle: string | null
}) {
  // Surface a plan/cap nudge when a free group has filled its 6 seats.
  const cappedFreeGroup = groups.find(g => g.plan === 'free' && g.memberCount >= g.memberCap)
  const sorted = [...members].sort((a, b) =>
    ATTENTION_META[a.attention].order - ATTENTION_META[b.attention].order
    || b.streak - a.streak,
  )
  const needs = sorted.filter(m => m.attention !== 'on_track').length

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href="/profile" aria-label="Back to profile" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Coach</h1>
          <p className="text-stone-400 text-xs">
            {groups.map(g => g.name).join(' · ') || 'Your group'}
          </p>
        </div>
      </header>

      {/* Prominent "today" banner — the first thing a coach should act on. */}
      {needs > 0 && (
        <div className="px-4 mb-3">
          <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-800/50 rounded-2xl px-4 py-3">
            <Bell size={18} className="text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-100 text-sm font-semibold">
                {needs} client{needs === 1 ? '' : 's'} need{needs === 1 ? 's' : ''} a check-in today
              </p>
              <p className="text-amber-200/70 text-xs mt-0.5">Tap a flagged client below to review their week and draft a check-in.</p>
            </div>
          </div>
        </div>
      )}

      <CoachStyleSetting userId={coachId} initial={coachStyle} />

      {members.length === 0 ? (
        <div className="px-4 mt-10 text-center">
          <p className="text-5xl mb-3">🧑‍🏫</p>
          <p className="text-stone-200 font-semibold">No members to coach yet</p>
          <p className="text-stone-400 text-sm mt-1">Invite people to your group and they&apos;ll show up here.</p>
        </div>
      ) : (
        <>
          <div className="px-4 mb-3 space-y-2">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-stone-300 text-sm">{members.length} member{members.length === 1 ? '' : 's'}</span>
              <span className={`text-sm font-semibold ${needs ? 'text-amber-300' : 'text-emerald-300'}`}>
                {needs ? `${needs} flagged` : 'Everyone on track 🎉'}
              </span>
            </div>
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

          <ul className="px-4 space-y-2">
            {sorted.map(m => {
              const meta = ATTENTION_META[m.attention]
              return (
                <li key={`${m.group_id}:${m.user_id}`}>
                  <Link
                    href={`/coach/${m.user_id}`}
                    className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-3 hover:border-stone-700 transition-colors"
                  >
                    <div className="relative shrink-0">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                        : <div className="w-11 h-11 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-300 text-sm font-semibold">{initials(m.display_name)}</div>}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-stone-900 ${meta.dot}`} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{m.display_name}</p>
                        <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.chip}`}>{meta.label}</span>
                      </div>
                      <p className="text-stone-400 text-xs truncate mt-0.5">
                        {m.topSignal
                          ?? (m.daysLogged
                            ? `${m.caloriesAvg.toLocaleString()} kcal/day · ${m.nutrientsOnTrack}/${m.nutrientsTotal} nutrients`
                            : 'No logs this week')}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-stone-200 text-sm font-semibold tabular-nums">{m.streak}🔥</p>
                      <ChevronRight size={16} className="text-stone-500 ml-auto" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>

          {hiddenCount > 0 && (
            <p className="px-4 mt-4 text-stone-500 text-xs flex items-center gap-1.5">
              <EyeOff size={13} /> {hiddenCount} member{hiddenCount === 1 ? '' : 's'} opted out of coach view.
            </p>
          )}
        </>
      )}

      <BottomNav active="coach" />
    </div>
  )
}
