'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Download, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// 'full' = visible to the group/coach; 'dark' = hidden. We expose this as a
// simple Public/Private choice (the finer-grained modes stay internal).
type Vis = 'public' | 'private'
const toVis = (mode: string): Vis => (mode === 'dark' ? 'private' : 'public')
const toMode = (v: Vis): string => (v === 'private' ? 'dark' : 'full')

export default function PrivacyClient({ initialPrivacyMode }: { initialPrivacyMode: string }) {
  const router = useRouter()
  const [vis, setVis] = useState<Vis>(toVis(initialPrivacyMode))
  const [savingVis, setSavingVis] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  async function exportData() {
    if (exporting) return
    setExporting(true); setExportError('')
    try {
      const res = await fetch('/api/export-data')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not export your data')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutrisync-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export your data')
    } finally {
      setExporting(false)
    }
  }

  async function setVisibility(next: Vis) {
    if (next === vis || savingVis) return
    const prev = vis
    setVis(next); setSavingVis(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('profiles').update({ privacy_mode: toMode(next) }).eq('id', user.id)
      if (error) setVis(prev)
    }
    setSavingVis(false)
  }

  async function deleteAccount() {
    setDeleting(true); setError('')
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not delete account')
      }
      const supabase = createClient()
      await supabase.auth.signOut().catch(() => {})
      router.push('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-safe pb-3 flex items-center gap-3">
        <Link href="/settings" aria-label="Back" className="text-stone-300 hover:text-white"><ArrowLeft size={22} /></Link>
        <h1 className="text-xl font-bold">Privacy</h1>
      </header>

      {/* Profile visibility */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Profile visibility</p>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-1.5 flex gap-1.5">
          {(['public', 'private'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              disabled={savingVis}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 ${
                vis === v ? 'bg-emerald-700 text-white' : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              {v === 'public' ? <Eye size={15} /> : <EyeOff size={15} />}
              {v === 'public' ? 'Public' : 'Private'}
            </button>
          ))}
        </div>
        <p className="text-stone-500 text-[11px] mt-1.5 px-1">
          {vis === 'public' ? 'Your group and coach can see your progress.' : 'Your data is hidden from your group and coach.'}
        </p>
      </section>

      {/* Feed visibility — per-post sharing exists today; a global default is coming. */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Feed visibility</p>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-center gap-3 opacity-60">
          <span className="flex-1 text-sm text-stone-200">Default post sharing</span>
          <span className="text-[10px] font-semibold text-stone-500 bg-stone-800 border border-stone-700 px-1.5 py-0.5 rounded-full">Soon</span>
        </div>
        <p className="text-stone-500 text-[11px] mt-1.5 px-1">For now, choose whether each meal is shared when you log it.</p>
      </section>

      {/* Data */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Data</p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="w-full bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-center gap-3 text-left hover:bg-stone-800/50 transition-colors disabled:opacity-60"
        >
          <Download size={16} className="text-stone-400 shrink-0" />
          <span className="flex-1 text-sm text-stone-200">{exporting ? 'Preparing your export…' : 'Export my data'}</span>
          {exporting && <span className="w-4 h-4 rounded-full border-2 border-stone-600 border-t-emerald-400 animate-spin" aria-hidden="true" />}
        </button>
        <p className="text-stone-500 text-[11px] mt-1.5 px-1">
          Download a JSON file of your meals, activity, water, weight, and group data.
        </p>
        {exportError && <p className="text-red-400 text-xs mt-1.5 px-1">{exportError}</p>}
      </section>

      {/* Danger zone */}
      <section className="px-4">
        <p className="text-red-400/80 text-xs uppercase tracking-wider mb-2">Danger zone</p>
        <div className="bg-stone-900 border border-red-900/40 rounded-2xl p-4">
          {confirmDelete ? (
            <div className="space-y-3">
              <p className="text-stone-300 text-sm">Delete your account? This permanently erases your profile, meals, water, activity, and group membership. This cannot be undone.</p>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex items-center gap-2">
                <button onClick={deleteAccount} disabled={deleting} className="bg-red-900/70 hover:bg-red-900 text-red-100 text-sm font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete everything'}
                </button>
                <button onClick={() => { setConfirmDelete(false); setError('') }} disabled={deleting} className="text-stone-300 hover:text-white text-sm px-2 py-2 transition-colors disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-red-300 hover:text-red-200 text-sm font-medium transition-colors">
              <Trash2 size={16} /> Delete account
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
