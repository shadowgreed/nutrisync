'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Lock, AlertCircle, Sparkles, Send, RotateCcw, X, Check } from 'lucide-react'
import type { AttentionLevel, ClientSignal } from '@/lib/copilot'
import type { WeeklyReport } from '@/lib/weekly'

export interface CoachNote { id: string; body: string; created_at: string }
export interface PendingDraft { id: string; kind: 'nudge' | 'praise' | 'weekly_checkin'; draft_text: string; status: string; created_at: string }

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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 text-center">
      <p className="text-stone-400 text-[11px] uppercase tracking-wider">{label}</p>
      <p className="text-white text-2xl font-extrabold tabular-nums mt-1">{value}</p>
      {sub && <p className="text-stone-500 text-[11px] mt-0.5">{sub}</p>}
    </div>
  )
}

export default function CoachMemberClient({
  member, groupId, attention, signals, report, streak, initialNotes, initialDraft,
}: {
  member: Member; groupId: string; attention: AttentionLevel
  signals: ClientSignal[]; report: WeeklyReport; streak: number
  initialNotes: CoachNote[]; initialDraft: PendingDraft | null
}) {
  const [notes, setNotes] = useState<CoachNote[]>(initialNotes)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const meta = ATTENTION_LABEL[attention]

  // ── Copilot draft state ────────────────────────────────────────────────────
  const [pending, setPending] = useState<PendingDraft | null>(initialDraft)
  const [draftText, setDraftText] = useState(initialDraft?.draft_text ?? '')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)
  const [copilotError, setCopilotError] = useState('')

  async function generateDraft() {
    if (generating) return
    setGenerating(true); setCopilotError(''); setSentOk(false)
    try {
      const res = await fetch('/api/coach/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
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

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-16">
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
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${meta.chip}`}>{meta.label}</span>
          </div>
        </div>
      </header>

      {/* Signals — why this member is flagged */}
      {signals.length > 0 && (
        <section className="px-4 mb-4">
          <ul className="space-y-1.5">
            {signals.map((s, i) => (
              <li key={i} className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${
                s.severity === 'warn'
                  ? 'bg-amber-950/40 border-amber-900/50 text-amber-100'
                  : 'bg-stone-900 border-stone-800 text-stone-300'
              }`}>
                <AlertCircle size={15} className="shrink-0 opacity-80" />
                {s.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* This week, at a glance */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">This week · {report.weekLabel}</p>
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Calories"
            value={report.daysLogged ? report.calories.avgPerDay.toLocaleString() : '—'}
            sub={report.daysLogged ? `of ${report.calories.target.toLocaleString()}/day` : 'no logs'}
          />
          <Stat label="Nutrients" value={`${report.nutrients.onTrack}/${report.nutrients.total}`} sub="on track" />
          <Stat label="Active" value={`${report.activities.activeDays}/${report.activities.goalDays}`} sub={`${streak}🔥 streak`} />
        </div>
      </section>

      {/* Copilot — draft a check-in the coach reviews & sends */}
      <section className="px-4 mb-5">
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
            <p className="text-stone-300 text-sm mb-3">
              Draft a personalized check-in from {member.display_name}&apos;s week. You review and edit it before anything sends.
            </p>
            <button
              onClick={generateDraft}
              disabled={generating}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Sparkles size={15} /> {generating ? 'Drafting…' : sentOk ? 'Draft another' : 'Draft a check-in'}
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

      {/* Private coach notes */}
      <section className="px-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Lock size={13} className="text-stone-500" />
          <p className="text-stone-400 text-xs uppercase tracking-wider">Private notes</p>
        </div>
        <p className="text-stone-500 text-[11px] mb-2">Only you can see these — {member.display_name} can&apos;t.</p>

        <div className="flex gap-2 mb-3">
          <textarea
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
    </div>
  )
}
