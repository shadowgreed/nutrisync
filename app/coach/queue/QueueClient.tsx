'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, RotateCcw, X, Sparkles } from 'lucide-react'

export interface QueueItem {
  id: string
  kind: 'nudge' | 'praise' | 'weekly_checkin'
  draft_text: string
  member_id: string
  display_name: string
  avatar_url: string | null
}

const KIND_LABEL: Record<QueueItem['kind'], string> = {
  nudge: 'Nudge', praise: 'Praise', weekly_checkin: 'Weekly check-in',
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function QueueCard({ item, onResolved }: { item: QueueItem; onResolved: (id: string, sent: boolean) => void }) {
  const [text, setText] = useState(item.draft_text)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (busy || !text.trim()) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/coach/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: item.id, action: 'send', text }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not send')
      onResolved(item.id, true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send'); setBusy(false) }
  }

  async function dismiss() {
    if (busy) return
    setBusy(true)
    await fetch('/api/coach/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: item.id, action: 'dismiss' }),
    }).catch(() => {})
    onResolved(item.id, false)
  }

  async function redo() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/coach/draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: item.member_id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not redraft')
      setText(json.draft.draft_text as string)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not redraft') }
    finally { setBusy(false) }
  }

  return (
    <li className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/coach/${item.member_id}`} className="flex items-center gap-2 min-w-0">
          {item.avatar_url
            ? <img src={item.avatar_url} alt={item.display_name} className="w-8 h-8 rounded-full object-cover" />
            : <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center text-emerald-300 text-xs font-semibold">{initials(item.display_name)}</div>}
          <span className="font-semibold truncate">{item.display_name}</span>
        </Link>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-800/60 bg-emerald-900/40 text-emerald-200">
          {KIND_LABEL[item.kind]}
        </span>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, 2000))}
        rows={3}
        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
      />
      <div className="flex items-center gap-2 mt-3">
        <button onClick={send} disabled={busy || !text.trim()} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          <Send size={14} /> Send
        </button>
        <button onClick={redo} disabled={busy} aria-label="Regenerate" className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
          <RotateCcw size={14} /> Redo
        </button>
        <button onClick={dismiss} disabled={busy} className="ml-auto flex items-center gap-1.5 text-stone-400 hover:text-red-300 text-sm px-2 py-2 transition-colors">
          <X size={15} /> Dismiss
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </li>
  )
}

export default function QueueClient({ initialItems }: { initialItems: QueueItem[] }) {
  const [items, setItems] = useState<QueueItem[]>(initialItems)
  const [sentCount, setSentCount] = useState(0)

  function onResolved(id: string, sent: boolean) {
    setItems(prev => prev.filter(i => i.id !== id))
    if (sent) setSentCount(c => c + 1)
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-16">
      <header className="px-4 pt-safe pb-3 flex items-center gap-3">
        <Link href="/coach" aria-label="Back to roster" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles size={18} className="text-emerald-400" /> Check-in queue</h1>
          <p className="text-stone-400 text-xs">{items.length} pending{sentCount ? ` · ${sentCount} sent` : ''}</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="px-4 mt-10 text-center">
          <p className="text-5xl mb-3">{sentCount ? '✅' : '✨'}</p>
          <p className="text-stone-200 font-semibold">{sentCount ? 'All caught up!' : 'No drafts waiting'}</p>
          <p className="text-stone-400 text-sm mt-1">
            {sentCount ? 'Your check-ins are on their way.' : 'Open a member and tap “Draft a check-in” to queue one up.'}
          </p>
        </div>
      ) : (
        <ul className="px-4 space-y-3">
          {items.map(item => <QueueCard key={item.id} item={item} onResolved={onResolved} />)}
        </ul>
      )}
    </div>
  )
}
