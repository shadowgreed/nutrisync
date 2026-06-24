'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Copy, Check, LogOut, Camera, Loader2, UserPlus, X, Pencil, Link2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface GroupRow { id: string; name: string; invite_code: string; created_by: string | null; photo_url: string | null }
interface PendingRequest { id: string; user_id: string; display_name: string; avatar_url: string | null }

interface Props {
  group: GroupRow
  isOwner: boolean
  isCoach: boolean
  memberCount: number
  coach: { name: string; avatar_url: string | null } | null
  pendingRequests: PendingRequest[]
}

export default function ManageClient({ group, isOwner, isCoach, memberCount, coach, pendingRequests }: Props) {
  const router = useRouter()
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<'code' | 'invite' | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [requests, setRequests] = useState<PendingRequest[]>(pendingRequests)
  const [resolving, setResolving] = useState<string | null>(null)
  const [groupPhoto, setGroupPhoto] = useState<string | null>(group.photo_url)
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false)
  const [groupPhotoError, setGroupPhotoError] = useState('')
  const groupPhotoRef = useRef<HTMLInputElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [groupName, setGroupName] = useState(group.name)
  const [nameDraft, setNameDraft] = useState(group.name)
  const [savingName, setSavingName] = useState(false)
  useEffect(() => { setOrigin(window.location.origin) }, [])

  const inviteUrl = `${origin}/group/join/${group.invite_code}`
  const requestUrl = `${origin}/group/request/${group.id}`

  function copy(which: 'code' | 'invite', text: string) {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  async function resolveRequest(id: string, approve: boolean) {
    setResolving(id)
    try {
      const res = await fetch('/api/group/resolve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, approve }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
        router.refresh()
      }
    } finally {
      setResolving(null)
    }
  }

  async function handleGroupPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingGroupPhoto(true)
    setGroupPhotoError('')
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/group-${group.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id, photo_url: publicUrl }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't save photo")
      setGroupPhoto(publicUrl)
      router.refresh()
    } catch (err) {
      setGroupPhotoError(err instanceof Error ? err.message : 'Could not update group photo')
    } finally {
      setUploadingGroupPhoto(false)
      if (groupPhotoRef.current) groupPhotoRef.current.value = ''
    }
  }

  async function saveGroupName() {
    const next = nameDraft.trim()
    if (!next || next === groupName) { setEditingName(false); return }
    setSavingName(true)
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id, name: next }),
      })
      if (res.ok) {
        setGroupName(next)
        setEditingName(false)
        router.refresh()
      }
    } finally {
      setSavingName(false)
    }
  }

  async function leaveGroup() {
    setLeaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLeaving(false); return }
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', user.id)
    setLeaving(false)
    if (!error) { setConfirmLeave(false); router.push('/profile') }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href="/profile" aria-label="Back to profile" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold">Group settings</h1>
      </header>

      {/* ── Group information ─────────────────────────────────────────────── */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Group</p>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <input ref={groupPhotoRef} type="file" accept="image/*" onChange={handleGroupPhoto} className="hidden" />
            {isOwner ? (
              <button
                onClick={() => groupPhotoRef.current?.click()}
                disabled={uploadingGroupPhoto}
                aria-label="Change group photo"
                className="relative w-14 h-14 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center overflow-hidden shrink-0"
              >
                {groupPhoto
                  ? <img src={groupPhoto} alt="Group photo" className="w-full h-full object-cover" />
                  : <Users size={22} className="text-emerald-400" />}
                <span className="absolute -bottom-1 -right-1 bg-stone-800 border border-stone-600 rounded-full p-1 text-stone-100">
                  {uploadingGroupPhoto ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                </span>
              </button>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-900/50 border border-emerald-800/50 flex items-center justify-center overflow-hidden shrink-0">
                {groupPhoto
                  ? <img src={groupPhoto} alt="Group photo" className="w-full h-full object-cover" />
                  : <Users size={22} className="text-emerald-400" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value.slice(0, 40))}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveGroupName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 min-w-0 bg-stone-800 border border-stone-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button onClick={saveGroupName} disabled={savingName} aria-label="Save name" className="shrink-0 text-emerald-400 hover:text-emerald-300 p-1 disabled:opacity-50">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setEditingName(false); setNameDraft(groupName) }} aria-label="Cancel" className="shrink-0 text-stone-400 hover:text-white p-1">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-white font-semibold truncate">{groupName}</p>
                  {isOwner && (
                    <button onClick={() => { setNameDraft(groupName); setEditingName(true) }} aria-label="Edit group name" className="shrink-0 text-stone-400 hover:text-white p-0.5">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-stone-400 text-xs mt-0.5">
                {memberCount} member{memberCount === 1 ? '' : 's'}{coach ? ` · Coach ${coach.name}` : ''}
              </p>
            </div>
          </div>
          {groupPhotoError && <p className="text-red-400 text-xs mt-2">{groupPhotoError}</p>}
        </div>
      </section>

      {/* ── Coach dashboard (coaches only) ────────────────────────────────── */}
      {isCoach && (
        <section className="px-4 mb-5">
          <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Coaching</p>
          <Link
            href="/coach"
            className="flex items-center justify-between bg-emerald-900/30 border border-emerald-800/50 rounded-2xl px-4 py-3.5 hover:bg-emerald-900/50 transition-colors"
          >
            <span className="text-emerald-200 text-sm font-semibold">🧑‍🏫 Coach dashboard</span>
            <span className="text-emerald-400 text-xs">Review your crew →</span>
          </Link>
        </section>
      )}

      {/* ── Invitations ───────────────────────────────────────────────────── */}
      <section className="px-4 mb-5">
        <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">Invitations</p>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800">
          {isOwner && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-stone-300 text-sm font-medium">Invite code</p>
                <code className="text-emerald-300 text-sm font-mono tracking-wider">{group.invite_code}</code>
              </div>
              <button
                onClick={() => copy('code', inviteUrl)}
                disabled={!inviteUrl}
                aria-label="Copy invite link"
                className="shrink-0 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
              >
                {copied === 'code' ? <Check size={15} /> : <Copy size={15} />}
                {copied === 'code' ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-stone-300 text-sm font-medium">Invite link</p>
              <p className="text-stone-500 text-xs">{isOwner ? 'Shareable approval link' : 'The founder approves new members'}</p>
            </div>
            <button
              onClick={() => copy('invite', requestUrl)}
              disabled={!requestUrl}
              className="shrink-0 flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-100 text-sm font-semibold px-3 py-2 rounded-xl transition-colors"
            >
              {copied === 'invite' ? <Check size={15} /> : <Link2 size={15} />}
              {copied === 'invite' ? 'Copied' : 'Copy'}
            </button>
          </div>
          {isOwner && (
            <div className="px-4 py-3">
              <p className="text-stone-300 text-sm font-medium mb-1">
                Pending approvals{requests.length > 0 ? ` · ${requests.length}` : ''}
              </p>
              {requests.length === 0 ? (
                <p className="text-stone-500 text-xs">No requests right now.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {requests.map(r => (
                    <div key={r.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                        {r.avatar_url ? <img src={r.avatar_url} alt={r.display_name} className="w-full h-full object-cover" /> : r.display_name[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 min-w-0 text-stone-200 text-sm truncate">{r.display_name}</span>
                      <button
                        onClick={() => resolveRequest(r.id, true)}
                        disabled={resolving === r.id}
                        className="shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resolving === r.id ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => resolveRequest(r.id, false)}
                        disabled={resolving === r.id}
                        aria-label={`Deny ${r.display_name}`}
                        className="shrink-0 text-stone-400 hover:text-red-300 p-1.5 transition-colors disabled:opacity-50"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <section className="px-4">
        <p className="text-red-400/80 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Danger zone
        </p>
        <div className="bg-stone-900 border border-red-900/40 rounded-2xl p-4">
          {confirmLeave ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-stone-300 text-xs">Leave “{groupName}”? You can rejoin with the code.</p>
              <button
                onClick={leaveGroup}
                disabled={leaving}
                className="shrink-0 bg-red-900/60 hover:bg-red-900 text-red-200 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {leaving ? 'Leaving…' : 'Leave'}
              </button>
              <button onClick={() => setConfirmLeave(false)} className="shrink-0 text-stone-300 hover:text-white text-xs px-2 py-2 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="flex items-center gap-1.5 text-red-300 hover:text-red-200 text-sm font-medium transition-colors"
            >
              <LogOut size={15} /> Leave group
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
