'use client'

import { useState, useRef } from 'react'
import { Flame, PartyPopper, Heart, MessageCircle, Send, MoreHorizontal, Trash2 } from 'lucide-react'
import { kmToMiles } from '@/lib/fitness'
import MiniProfileModal from '@/components/MiniProfileModal'
import type { FeedActivityEntry, Comment } from '@/types'

const HEART = '❤️'

function shortAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const ACTIVITY_EMOJI: Record<string, string> = {
  Walking: '🚶', Running: '🏃', Cycling: '🚴', Hiking: '🥾', Swimming: '🏊',
  'Weight training': '🏋️', HIIT: '🔥', Yoga: '🧘', 'Jump rope': '🪢',
  Rowing: '🚣', Dancing: '💃', Pilates: '🤸',
}

function metric(a: FeedActivityEntry): string {
  if (a.distance_km != null) return `${kmToMiles(a.distance_km).toFixed(2)} mi`
  if (a.steps != null) return `${a.steps.toLocaleString()} steps`
  if (a.duration_minutes != null) return `${a.duration_minutes} min`
  return ''
}

interface Props {
  entry: FeedActivityEntry
  currentUserId: string
  onReact: (activityId: string, emoji: string) => Promise<void>
  onComment: (activityId: string, text: string) => Promise<void>
  onDeleteComment: (activityId: string, commentId: string) => Promise<void>
  onLikeComment?: (commentId: string, liked: boolean) => void
  // Founder moderation — set when the viewer founded this author's group.
  canModerate?: boolean
  moderationGroup?: { id: string; name: string } | null
  onDelete?: (activityId: string) => Promise<void>
  onRemoveMember?: (userId: string) => Promise<void>
}

export default function ActivityCard({ entry, currentUserId, onReact, onComment, onDeleteComment, onLikeComment, canModerate = false, moderationGroup = null, onDelete, onRemoveMember }: Props) {
  const [showProfile, setShowProfile] = useState(false)
  const [cheer, setCheer] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [poppedComment, setPoppedComment] = useState<string | null>(null)
  const lastCommentTap = useRef<{ id: string; t: number } | null>(null)

  // Double-tap a comment to like it (likes only; the heart button still toggles).
  function onCommentTap(c: Comment) {
    const now = Date.now()
    const prev = lastCommentTap.current
    if (prev && prev.id === c.id && now - prev.t < 300) {
      lastCommentTap.current = null
      setPoppedComment(c.id)
      setTimeout(() => setPoppedComment(p => (p === c.id ? null : p)), 750)
      if (onLikeComment && !c.liked_by_me) onLikeComment(c.id, false)
    } else {
      lastCommentTap.current = { id: c.id, t: now }
    }
  }
  const emoji = ACTIVITY_EMOJI[entry.activity_name] ?? '💪'
  const isOwn = entry.user_id === currentUserId
  const isModeration = !isOwn && canModerate
  const liked = entry.reactions.some(r => r.user_id === currentUserId)
  const likeCount = entry.reactions.length

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(entry.id) }
    finally { setDeleting(false) }
  }

  async function sendCheer() {
    if (cheer !== 'idle') return
    setCheer('sending')
    try {
      const res = await fetch('/api/cheer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: entry.user_id }),
      })
      setCheer(res.ok ? 'sent' : 'idle')
    } catch {
      setCheer('idle')
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    await onComment(entry.id, commentText.trim())
    setCommentText('')
    setSubmitting(false)
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg shadow-black/30">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => !isOwn && setShowProfile(true)}
          disabled={isOwn}
          aria-label={isOwn ? undefined : `View ${entry.profile.display_name}'s profile`}
          className={`flex items-center gap-3 flex-1 min-w-0 text-left ${isOwn ? '' : 'group'}`}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-700 to-orange-900 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
            {entry.profile.avatar_url
              ? <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : entry.profile.display_name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-white font-semibold text-sm truncate ${isOwn ? '' : 'group-hover:text-orange-300 transition-colors'}`}>{entry.profile.display_name}</p>
            <p className="text-stone-400 text-xs">completed a workout · {shortAgo(entry.logged_at)}</p>
          </div>
        </button>
        {!isOwn && (
          <button
            onClick={sendCheer}
            disabled={cheer !== 'idle'}
            aria-label={`Cheer ${entry.profile.display_name}`}
            className={`shrink-0 flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl text-sm font-semibold transition-colors ${
              cheer === 'sent'
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
            }`}
          >
            {cheer === 'sent' ? <><PartyPopper size={15} aria-hidden="true" /> Cheered</> : <>👏 Cheer</>}
          </button>
        )}
        {isModeration && onDelete && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Post options"
              aria-expanded={menuOpen}
              className="text-stone-400 hover:text-white transition-colors p-1.5 -mr-1.5"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false) }} />
                <div className="absolute right-0 top-9 z-20 w-52 bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
                  <p className="px-3.5 pt-2.5 pb-1 text-amber-400/90 text-[11px] font-medium uppercase tracking-wider">Founder tools</p>
                  {confirmDelete ? (
                    <div className="p-2.5">
                      <p className="text-stone-300 text-xs px-1 pb-2">Remove {entry.profile.display_name}&apos;s post? This can&apos;t be undone.</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 bg-red-900/70 hover:bg-red-900 text-red-100 text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deleting ? '…' : 'Remove'}
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(false); setMenuOpen(false) }}
                          className="flex-1 text-stone-300 hover:text-white text-xs py-1.5 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center gap-2 px-3.5 py-3 text-red-300 hover:bg-stone-700 text-sm text-left transition-colors"
                    >
                      <Trash2 size={15} aria-hidden="true" /> Remove post
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Activity body */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 bg-gradient-to-br from-orange-950/50 to-stone-900 border border-orange-900/40 rounded-2xl p-4">
          <div className="w-11 h-11 rounded-xl bg-orange-900/40 flex items-center justify-center text-2xl shrink-0" aria-hidden="true">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{entry.activity_name}</p>
            {metric(entry) && <p className="text-stone-400 text-xs">{metric(entry)}</p>}
          </div>
          {entry.calories_burned > 0 && (
            <div className="text-right shrink-0">
              <p className="text-orange-400 font-bold tabular-nums flex items-center gap-1 justify-end">
                <Flame size={14} aria-hidden="true" /> {entry.calories_burned}
              </p>
              <p className="text-stone-500 text-xs">kcal burned</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions — heart · comment */}
      <div className="px-2.5 py-1.5 border-t border-stone-800/70 flex items-center gap-1">
        <button
          onClick={() => onReact(entry.id, HEART)}
          aria-pressed={liked}
          aria-label={`Like${likeCount > 0 ? `, ${likeCount}` : ''}`}
          className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors group/like"
        >
          <Heart size={23} className={`transition-all ${liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-stone-300 group-hover/like:text-rose-400'}`} aria-hidden="true" />
          {likeCount > 0 && <span className={`text-sm ${liked ? 'text-rose-300' : 'text-stone-300'}`}>{likeCount}</span>}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          aria-expanded={showComments}
          aria-label={`Comments${entry.comments.length > 0 ? `, ${entry.comments.length}` : ''}`}
          className={`flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors ${showComments ? 'text-emerald-400' : 'text-stone-300 hover:text-white'}`}
        >
          <MessageCircle size={21} aria-hidden="true" />
          {entry.comments.length > 0 && <span className="text-sm">{entry.comments.length}</span>}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-stone-800 px-4 py-3 space-y-3">
          {entry.comments.length === 0 && (
            <p className="text-stone-400 text-xs text-center py-1">No comments yet — be first!</p>
          )}
          {entry.comments.map(c => (
            <div key={c.id} className="flex gap-2.5 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-700 to-orange-900 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                {c.profile?.avatar_url
                  ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (c.profile?.display_name?.[0]?.toUpperCase() ?? '?')}
              </div>
              <div className="flex-1 min-w-0 relative" onClick={() => onCommentTap(c)}>
                {poppedComment === c.id && (
                  <div className="pointer-events-none absolute -top-1 left-0 z-10" aria-hidden="true">
                    <Heart size={28} className="fill-rose-500 text-rose-500 drop-shadow animate-heart-pop" />
                  </div>
                )}
                <p className="text-sm leading-snug">
                  <span className="text-white font-semibold mr-1.5">{c.profile?.display_name ?? 'User'}</span>
                  <span className="text-stone-200">{c.text}</span>
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-stone-400 text-xs">{shortAgo(c.created_at)}</span>
                  {onLikeComment && (
                    <button
                      onClick={() => onLikeComment(c.id, !!c.liked_by_me)}
                      aria-label={c.liked_by_me ? 'Unlike comment' : 'Like comment'}
                      aria-pressed={!!c.liked_by_me}
                      className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-rose-400 transition-colors"
                    >
                      <Heart size={13} className={c.liked_by_me ? 'fill-rose-500 text-rose-500' : ''} aria-hidden="true" />
                      {(c.like_count ?? 0) > 0 && <span className={c.liked_by_me ? 'text-rose-400' : ''}>{c.like_count}</span>}
                    </button>
                  )}
                  {c.user_id === currentUserId && (
                    <button onClick={() => onDeleteComment(entry.id, c.id)} className="text-stone-500 hover:text-red-300 text-xs">Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 pt-1">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value.slice(0, 280))}
              placeholder="Add a comment…"
              className="flex-1 bg-stone-800 border border-stone-700 rounded-full px-4 py-2.5 text-white text-base placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" disabled={!commentText.trim() || submitting} className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-full px-3.5 transition-colors">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {showProfile && (
        <MiniProfileModal
          userId={entry.user_id}
          name={entry.profile.display_name}
          onClose={() => setShowProfile(false)}
          moderation={isModeration && moderationGroup ? { groupId: moderationGroup.id, groupName: moderationGroup.name } : null}
          onRemoveMember={onRemoveMember}
        />
      )}
    </div>
  )
}
