'use client'

import { useState, useRef, useEffect } from 'react'
import { Heart, MessageCircle, Send, X, Trash2, Pencil, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import type { FeedEntry, NutrientKey, MacroTotals, Comment } from '@/types'
import { NUTRIENT_META, NUTRIENT_KEYS } from '@/lib/nutrients'
import { MACRO_KEYS, MACRO_META, emptyMacros } from '@/lib/macros'
import MiniProfileModal from '@/components/MiniProfileModal'
import Segmented from '@/components/Segmented'
import { useI18n } from '@/components/I18nProvider'

const HEART = '❤️'

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
}
const MEAL_OPTIONS: { key: string; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]
// Per-meal gradient for posts without a photo, so text-only logs still have a face.
const MEAL_GRADIENT: Record<string, string> = {
  breakfast: 'from-amber-900/50 to-stone-900',
  lunch: 'from-sky-900/50 to-stone-900',
  dinner: 'from-indigo-900/50 to-stone-900',
  snack: 'from-emerald-900/50 to-stone-900',
}

// Per-meal thresholds — a single meal covering 25%+ of a daily target is "good"
function mealNutrientStatus(current: number, target: number): 'great' | 'good' | 'low' {
  const pct = target > 0 ? current / target : 0
  if (pct >= 0.25) return 'great'
  if (pct >= 0.08) return 'good'
  return 'low'
}

function pctOfDaily(current: number, target: number): number {
  return target > 0 ? Math.round((current / target) * 100) : 0
}

function shortAgo(iso: string, nowLabel = 'now'): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return nowLabel
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

interface Props {
  entry: FeedEntry
  currentUserId: string
  onReact: (logId: string, emoji: string) => Promise<void>
  onComment: (logId: string, text: string, parentId?: string) => Promise<void>
  onDelete?: (logId: string) => Promise<void>
  onEdit?: (logId: string, patch: { caption?: string; meal_type?: string }) => Promise<void>
  onDeleteComment?: (logId: string, commentId: string) => Promise<void>
  onLikeComment?: (commentId: string, liked: boolean) => void
  nameMap?: Record<string, string>
  // Founder moderation — set when the viewer founded this author's group.
  canModerate?: boolean
  moderationGroup?: { id: string; name: string } | null
  onRemoveMember?: (userId: string) => Promise<void>
  // Set when a notification deep-linked straight to this post — opens the
  // comment thread immediately instead of leaving it behind the teaser.
  autoOpenComments?: boolean
}

export default function FeedCard({ entry, currentUserId, onReact, onComment, onDelete, onEdit, onDeleteComment, onLikeComment, nameMap = {}, canModerate = false, moderationGroup = null, onRemoveMember, autoOpenComments = false }: Props) {
  const { t } = useI18n()
  const [showComments, setShowComments] = useState(autoOpenComments)
  // The deep-link target only resolves after mount (it comes from the URL in
  // the parent), so the initial state above misses the flip from false to
  // true — adjust state during render (React's documented pattern for this,
  // rather than an effect) so it still opens without an extra render pass.
  const [prevAutoOpen, setPrevAutoOpen] = useState(autoOpenComments)
  if (autoOpenComments !== prevAutoOpen) {
    setPrevAutoOpen(autoOpenComments)
    if (autoOpenComments) setShowComments(true)
  }
  const [showNutrients, setShowNutrients] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [menuComment, setMenuComment] = useState<Comment | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [poppedComment, setPoppedComment] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCommentTap = useRef<{ id: string; t: number } | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [editCaption, setEditCaption] = useState(entry.caption ?? '')
  const [editMeal, setEditMeal] = useState<string>(entry.meal_type)
  const [savingEdit, setSavingEdit] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [heartBurst, setHeartBurst] = useState(false)
  const [broken, setBroken] = useState<Record<string, boolean>>({})
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Double-tap a photo to like (never unlike — Instagram behavior); single tap
  // opens the lightbox. We delay the single-tap slightly to detect the double.
  function likeWithBurst() {
    if (!liked) onReact(entry.id, HEART)
    setHeartBurst(true)
    setTimeout(() => setHeartBurst(false), 750)
  }
  function onPhotoTap(i: number) {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current)
      tapTimer.current = null
      likeWithBurst()
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null
        setLightboxIndex(i)
      }, 240)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } finally {
      setDeleting(false)
    }
  }

  function openEdit() {
    setEditCaption(entry.caption ?? '')
    setEditMeal(entry.meal_type)
    setEditing(true)
    setMenuOpen(false)
  }

  async function saveEdit() {
    if (!onEdit) return
    setSavingEdit(true)
    try {
      await onEdit(entry.id, { caption: editCaption, meal_type: editMeal })
      setEditing(false)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleShare() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const shareUrl = photos[0] ?? `${origin}/feed`
    const text = entry.caption || t.feedCard.shareText(entry.profile.display_name, t.mealTypes[entry.meal_type as keyof typeof t.mealTypes]?.label ?? entry.meal_type)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'NutriSync', text, url: shareUrl })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setShareNote(t.feedCard.linkCopied)
        setTimeout(() => setShareNote(''), 1800)
      }
    } catch { /* user cancelled the share sheet */ }
  }

  const isOwnLog = entry.user_id === currentUserId
  const isModeration = !isOwnLog && canModerate
  const effectivePrivacy = entry.privacy_override ?? entry.profile.privacy_mode
  // Single heart reaction: any reaction row counts as a like.
  const liked = entry.reactions.some(r => r.user_id === currentUserId)
  const likeCount = entry.reactions.length

  // "Liked by Maria and 2 others" — your own like reads as "You", listed first.
  function likedByLabel() {
    if (likeCount === 0) return null
    const names = entry.reactions
      .map(r => (r.user_id === currentUserId ? t.feedCard.you : nameMap[r.user_id] ?? t.feedCard.someone))
      .sort((a, b) => (a === t.feedCard.you ? -1 : b === t.feedCard.you ? 1 : 0))
    const first = names[0]
    const rest = names.length - 1
    return (
      <>
        {t.feedCard.likedBy}<span className="text-white font-semibold">{first}</span>
        {rest === 1 && <>{t.feedCard.and}<span className="text-white font-semibold">{names[1]}</span></>}
        {rest > 1 && <>{t.feedCard.andOthers(rest)}</>}
      </>
    )
  }
  // Older posts saved blob: URLs that only existed in the author's browser session —
  // those are permanently dead, so skip them. Newer posts may have multiple photos.
  // Drop any that fail to load at runtime too (dead/blocked URLs) so the card falls
  // back to the meal hero instead of showing a blank/broken image.
  const photos = (entry.photo_urls?.length ? entry.photo_urls : entry.photo_url ? [entry.photo_url] : [])
    .filter(u => !!u && !u.startsWith('blob:') && !broken[u])
  const showPhoto = photos.length > 0 && effectivePrivacy !== 'dark'

  // Keyboard controls for the photo lightbox: Escape closes, arrows navigate.
  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowLeft' && photos.length > 1)
        setLightboxIndex(i => (i === null ? i : (i - 1 + photos.length) % photos.length))
      else if (e.key === 'ArrowRight' && photos.length > 1)
        setLightboxIndex(i => (i === null ? i : (i + 1) % photos.length))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIndex, photos.length])

  // Build per-meal nutrient data
  const nutrientData = NUTRIENT_KEYS.map(k => {
    const meta = NUTRIENT_META[k as NutrientKey]
    const val = entry.nutrient_totals[k as NutrientKey] ?? 0
    const pct = pctOfDaily(val, meta.target)
    const status = mealNutrientStatus(val, meta.target)
    return { key: k as NutrientKey, meta, val, pct, status }
  }).sort((a, b) => b.pct - a.pct)

  const hasNutrientData = nutrientData.some(n => n.val > 0)
  // Top 3 nutrients this meal actually provides
  const richIn = hasNutrientData ? nutrientData.filter(n => n.status !== 'low').slice(0, 3) : []

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    await onComment(entry.id, commentText.trim(), replyTo?.id)
    setCommentText('')
    setReplyTo(null)
    setSubmitting(false)
  }

  function startReply(c: Comment) {
    // Reply always threads under the top-level comment.
    const rootId = c.parent_id ?? c.id
    setReplyTo({ id: rootId, name: c.profile?.display_name ?? t.social.userFallback })
    setMenuComment(null)
    setTimeout(() => commentInputRef.current?.focus(), 0)
  }

  async function deleteComment(c: Comment) {
    if (!onDeleteComment) return
    setDeletingCommentId(c.id)
    try {
      await onDeleteComment(entry.id, c.id)
    } finally {
      setDeletingCommentId(null)
      setMenuComment(null)
    }
  }

  // Long-press (touch) / right-click (desktop) opens the comment action sheet.
  function pressStart(c: Comment) {
    pressTimer.current = setTimeout(() => setMenuComment(c), 450)
  }
  function pressEnd() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }

  // Double-tap a comment to like it (Instagram-style: likes, never unlikes — the
  // heart button still toggles). Pops a heart for feedback.
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

  // Thread comments: top-level + replies grouped under their parent.
  const topLevelComments = entry.comments.filter(c => !c.parent_id)
  const repliesByParent = entry.comments.reduce((acc, c) => {
    if (c.parent_id) (acc[c.parent_id] ??= []).push(c)
    return acc
  }, {} as Record<string, typeof entry.comments>)

  function renderComment(c: Comment, isReply: boolean) {
    const isOwnComment = c.user_id === currentUserId
    return (
      <div key={c.id} className={`flex gap-2.5 items-start ${isReply ? 'ml-10' : ''} ${deletingCommentId === c.id ? 'opacity-40' : ''}`}>
        <div className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden`}>
          {c.profile?.avatar_url
            ? <img src={c.profile.avatar_url} alt={c.profile.display_name} className="w-full h-full object-cover" />
            : (c.profile?.display_name?.[0]?.toUpperCase() ?? '?')}
        </div>
        <div
          className="flex-1 min-w-0 relative"
          onClick={() => onCommentTap(c)}
          onContextMenu={e => { e.preventDefault(); setMenuComment(c) }}
          onTouchStart={() => pressStart(c)}
          onTouchEnd={pressEnd}
          onTouchMove={pressEnd}
          onMouseDown={() => pressStart(c)}
          onMouseUp={pressEnd}
          onMouseLeave={pressEnd}
        >
          {poppedComment === c.id && (
            <div className="pointer-events-none absolute -top-1 left-0 z-10" aria-hidden="true">
              <Heart size={28} className="fill-rose-500 text-rose-500 drop-shadow animate-heart-pop" />
            </div>
          )}
          <p className="text-sm leading-snug select-none">
            <span className="text-white font-semibold mr-1.5">{c.profile?.display_name ?? t.social.userFallback}</span>
            <span className="text-stone-200">{c.text}</span>
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-stone-400 text-xs">{shortAgo(c.created_at, t.feedCard.now)}</span>
            {onLikeComment && (
              <button
                onClick={() => onLikeComment(c.id, !!c.liked_by_me)}
                aria-label={c.liked_by_me ? t.social.unlikeCommentAria : t.social.likeCommentAria}
                aria-pressed={!!c.liked_by_me}
                className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-rose-400 transition-colors"
              >
                <Heart size={13} className={c.liked_by_me ? 'fill-rose-500 text-rose-500' : ''} aria-hidden="true" />
                {(c.like_count ?? 0) > 0 && <span className={c.liked_by_me ? 'text-rose-400' : ''}>{c.like_count}</span>}
              </button>
            )}
            <button onClick={() => startReply(c)} className="text-stone-400 hover:text-stone-200 text-xs font-medium">{t.feedCard.reply}</button>
            {isOwnComment && onDeleteComment && (
              <button onClick={() => deleteComment(c)} disabled={deletingCommentId === c.id} className="text-stone-500 hover:text-red-300 text-xs">
                {deletingCommentId === c.id ? '…' : t.social.deleteComment}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg shadow-black/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => !isOwnLog && setShowProfile(true)}
            disabled={isOwnLog}
            aria-label={isOwnLog ? undefined : t.social.viewProfileAria(entry.profile.display_name)}
            className={`flex items-center gap-3 flex-1 min-w-0 text-left ${isOwnLog ? '' : 'group'}`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
              {entry.profile.avatar_url
                ? <img src={entry.profile.avatar_url} alt={entry.profile.display_name} className="w-full h-full object-cover" />
                : entry.profile.display_name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-white font-semibold text-sm truncate ${isOwnLog ? '' : 'group-hover:text-emerald-300 transition-colors'}`}>{entry.profile.display_name}</p>
              {/* Meal type lives on the photo badge / hero; the header just timestamps */}
              <p className="text-stone-400 text-xs">{shortAgo(entry.logged_at, t.feedCard.now)}</p>
            </div>
          </button>
          {(isOwnLog || isModeration) && onDelete && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen(v => !v)}
                aria-label={t.social.postOptions}
                aria-expanded={menuOpen}
                className="text-stone-400 hover:text-white transition-colors p-1.5 -mr-1.5"
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false) }} />
                  <div className="absolute right-0 top-9 z-20 w-52 bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
                    {isModeration && !confirmDelete && (
                      <p className="px-3.5 pt-2.5 pb-1 text-amber-400/90 text-[11px] font-medium uppercase tracking-wider">Founder tools</p>
                    )}
                    {!confirmDelete && isOwnLog && onEdit && (
                      <button
                        onClick={openEdit}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-stone-100 hover:bg-stone-700 text-sm text-left transition-colors border-b border-stone-700/60"
                      >
                        <Pencil size={15} aria-hidden="true" /> {t.feedCard.editPost}
                      </button>
                    )}
                    {confirmDelete ? (
                      <div className="p-2.5">
                        <p className="text-stone-300 text-xs px-1 pb-2">
                          {isModeration
                            ? t.social.removePostConfirm(entry.profile.display_name)
                            : t.feedCard.deletePostConfirm}
                        </p>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 bg-red-900/70 hover:bg-red-900 text-red-100 text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting ? '…' : isModeration ? t.common.remove : t.common.delete}
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(false); setMenuOpen(false) }}
                            className="flex-1 text-stone-300 hover:text-white text-xs py-1.5 transition-colors"
                          >
                            {t.common.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-red-300 hover:bg-stone-700 text-sm text-left transition-colors"
                      >
                        <Trash2 size={15} aria-hidden="true" /> {isModeration ? t.social.removePost : t.feedCard.deletePost}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Inline editor — change the meal tag and caption */}
        {editing && (
          <div className="px-4 pb-3 space-y-3 border-b border-stone-800">
            <div>
              <p className="text-stone-400 text-xs mb-1.5">{t.feedCard.mealTag}</p>
              <Segmented
                variant="fill"
                options={MEAL_OPTIONS.map(m => ({
                  value: m.key,
                  label: t.mealTypes[m.key as keyof typeof t.mealTypes]?.label ?? m.label,
                  icon: <span aria-hidden="true">{MEAL_EMOJI[m.key]}</span>,
                }))}
                value={editMeal}
                onChange={setEditMeal}
                ariaLabel={t.feedCard.mealTag}
              />
            </div>
            <div>
              <p className="text-stone-400 text-xs mb-1.5">Caption</p>
              <textarea
                value={editCaption}
                onChange={e => setEditCaption(e.target.value.slice(0, 200))}
                rows={2}
                placeholder={t.feedCard.addCaption}
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
              >
                {savingEdit ? t.common.saving : t.feedCard.saveChanges}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={savingEdit}
                className="px-4 text-stone-300 hover:text-white text-sm py-2 transition-colors disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Photo(s) — single image or a swipeable carousel. Double-tap to like. */}
        {showPhoto && (
          <div className="relative">
            <div
              className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              onScroll={e => {
                const el = e.currentTarget
                const idx = Math.round(el.scrollLeft / el.clientWidth)
                if (idx !== photoIndex) setPhotoIndex(idx)
              }}
            >
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative w-full shrink-0 snap-center block focus:outline-none"
                  onClick={() => onPhotoTap(i)}
                  aria-label={t.feedCard.photoAria(i + 1, photos.length)}
                >
                  <img
                    src={url}
                    alt={t.feedCard.mealPhotoAlt(i + 1)}
                    loading="lazy"
                    decoding="async"
                    onError={() => setBroken(prev => ({ ...prev, [url]: true }))}
                    className="w-full aspect-[4/3] object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Double-tap heart burst */}
            {heartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart size={96} className="fill-white/90 text-white/90 drop-shadow-lg animate-heart-pop" aria-hidden="true" />
              </div>
            )}

            <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full capitalize pointer-events-none">
              <span aria-hidden="true">{MEAL_EMOJI[entry.meal_type] ?? ''}</span> {t.mealTypes[entry.meal_type as keyof typeof t.mealTypes]?.label ?? entry.meal_type}
            </span>
            {photos.length > 1 && (
              <>
                <span className="absolute top-3 right-3 bg-black/55 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full pointer-events-none tabular-nums">
                  {photoIndex + 1}/{photos.length}
                </span>
                <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                  {photos.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Photo-less posts get a meal-colored hero so the feed isn't grey bricks */}
        {!showPhoto && effectivePrivacy !== 'dark' && (
          <div className={`bg-gradient-to-br ${MEAL_GRADIENT[entry.meal_type] ?? 'from-stone-800 to-stone-900'} px-4 py-5 flex items-center gap-3`}>
            <span className="text-4xl shrink-0" aria-hidden="true">{MEAL_EMOJI[entry.meal_type] ?? '🍽️'}</span>
            <div className="min-w-0">
              <p className="text-white font-semibold capitalize">{t.mealTypes[entry.meal_type as keyof typeof t.mealTypes]?.label ?? entry.meal_type}</p>
              {entry.foods?.length > 0 && (
                <p className="text-stone-300 text-xs truncate">{entry.foods.map(f => f.name).slice(0, 3).join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {/* Caption */}
        {entry.caption && (
          <p className="px-4 pt-3 text-stone-200 text-sm leading-relaxed">
            {entry.caption}
          </p>
        )}

        {/* Nutrition — one glanceable line that expands to the full breakdown */}
        {effectivePrivacy !== 'dark' && (entry.total_calories > 0 || hasNutrientData) && (
          <div className="px-4 pt-3">
            <button
              onClick={() => setShowNutrients(v => !v)}
              aria-expanded={showNutrients}
              className="w-full flex items-center gap-2 text-left min-h-[28px]"
            >
              {entry.total_calories > 0 && (
                <span className="text-white font-semibold text-sm whitespace-nowrap">🔥 {entry.total_calories} kcal</span>
              )}
              {richIn.length > 0 && (
                <span className="text-stone-400 text-sm truncate">
                  {entry.total_calories > 0 ? '· ' : ''}{t.feedCard.richIn(richIn.slice(0, 2).map(n => t.nutrients[n.key as keyof typeof t.nutrients]).join(' & '))}
                </span>
              )}
              <ChevronDown size={16} className={`ml-auto shrink-0 text-stone-400 transition-transform ${showNutrients ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {showNutrients && (
              <div className="mt-3 space-y-3">
                {/* Macros */}
                {(() => {
                  const m = (entry.macro_totals as MacroTotals) ?? emptyMacros()
                  if (!MACRO_KEYS.some(k => (m[k] ?? 0) > 0)) return null
                  return (
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {MACRO_KEYS.map(k => (
                        <span key={k} className="text-stone-300 text-xs flex items-center gap-1">
                          <span className={`inline-block w-2 h-2 rounded-full ${MACRO_META[k].color}`} />
                          {Math.round(m[k] ?? 0)}{MACRO_META[k].unit} {t.macros[k]}
                        </span>
                      ))}
                    </div>
                  )
                })()}

                {/* Micronutrient bars */}
                {hasNutrientData ? (
                  <div className="bg-stone-800/50 rounded-xl p-3 space-y-2">
                    {nutrientData.map(n => (
                      <div key={n.key} className="flex items-center gap-2">
                        <span className="text-base w-5 text-center shrink-0">{n.meta.emoji}</span>
                        <span className="text-stone-400 text-xs w-20 shrink-0">{t.nutrients[n.key as keyof typeof t.nutrients]}</span>
                        <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              n.status === 'great' ? 'bg-emerald-500'
                              : n.status === 'good' ? 'bg-yellow-400'
                              : 'bg-stone-600'
                            }`}
                            style={{ width: `${Math.min(100, n.pct * 4)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium w-10 text-right shrink-0 ${
                          n.status === 'great' ? 'text-emerald-400'
                          : n.status === 'good' ? 'text-yellow-400'
                          : 'text-stone-400'
                        }`}>
                          {n.pct > 0 ? `${n.pct}%` : '—'}
                        </span>
                        <span className="text-stone-400 text-xs w-16 text-right shrink-0">
                          {n.val > 0
                            ? `${n.val % 1 === 0 ? n.val : n.val.toFixed(1)}${n.meta.unit}`
                            : ''}
                        </span>
                      </div>
                    ))}
                    <p className="text-stone-400 text-xs text-right pt-1">{t.feedCard.perServing}</p>
                  </div>
                ) : (
                  <p className="text-stone-400 text-xs">{t.feedCard.noBreakdown}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions — heart · comment · share (44px touch targets) */}
        <div className="px-2.5 py-1.5 mt-1 border-t border-stone-800/70 flex items-center gap-1">
          <button
            onClick={() => onReact(entry.id, HEART)}
            aria-pressed={liked}
            aria-label={t.social.likeAria(likeCount)}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors group/like"
          >
            <Heart
              size={24}
              className={`transition-all ${liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-stone-300 group-hover/like:text-rose-400'}`}
              aria-hidden="true"
            />
            {likeCount > 0 && <span className={`text-sm ${liked ? 'text-rose-300' : 'text-stone-300'}`}>{likeCount}</span>}
          </button>

          <button
            onClick={() => setShowComments(v => !v)}
            aria-expanded={showComments}
            aria-label={t.social.commentsAria(entry.comments.length)}
            className={`flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg transition-colors ${showComments ? 'text-emerald-400' : 'text-stone-300 hover:text-white'}`}
          >
            <MessageCircle size={22} aria-hidden="true" />
            {entry.comments.length > 0 && <span className="text-sm">{entry.comments.length}</span>}
          </button>

          <button
            onClick={handleShare}
            aria-label={t.feedCard.shareAria}
            className="flex items-center gap-1.5 min-h-[44px] px-2 rounded-lg text-stone-300 hover:text-white transition-colors"
          >
            <Send size={21} aria-hidden="true" />
            {shareNote && <span className="text-emerald-400 text-xs">{shareNote}</span>}
          </button>
        </div>

        {/* Liked by … */}
        {likeCount > 0 && (
          <p className="px-4 -mt-1 pb-2 text-stone-300 text-xs">{likedByLabel()}</p>
        )}

        {/* Collapsed teaser — Instagram style */}
        {!showComments && entry.comments.length > 0 && (
          <button
            onClick={() => setShowComments(true)}
            className="block w-full text-left px-4 pb-3 -mt-1 text-stone-400 hover:text-stone-200 text-xs transition-colors"
          >
            {t.feedCard.viewComments(entry.comments.length)}
          </button>
        )}

        {/* Comments */}
        {showComments && (
          <div className="border-t border-stone-800 px-4 py-3 space-y-3">
            {entry.comments.length === 0 && (
              <p className="text-stone-400 text-xs text-center py-1">{t.social.noComments}</p>
            )}
            {topLevelComments.map(c => (
              <div key={c.id} className="space-y-2.5">
                {renderComment(c, false)}
                {(repliesByParent[c.id] ?? []).map(r => renderComment(r, true))}
              </div>
            ))}

            {/* Replying-to chip */}
            {replyTo && (
              <div className="flex items-center justify-between bg-stone-800/70 rounded-lg px-3 py-1.5">
                <span className="text-stone-300 text-xs">{t.feedCard.replyingTo}<span className="text-white font-medium">{replyTo.name}</span></span>
                <button onClick={() => setReplyTo(null)} aria-label={t.feedCard.cancelReplyAria} className="text-stone-400 hover:text-white p-1 -mr-1">
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={submitComment} className="flex gap-2 pt-1">
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, 280))}
                placeholder={replyTo ? t.feedCard.replyToPlaceholder(replyTo.name) : t.social.addComment}
                className="flex-1 bg-stone-800 border border-stone-700 rounded-full px-4 py-2.5 text-white text-base placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submitting}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-full px-3.5 transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.feedCard.viewerAria}
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
            aria-label={t.common.close}
          >
            <X size={28} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/40 rounded-full p-2 z-10"
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length) }}
                aria-label={t.feedCard.prevPhoto}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/40 rounded-full p-2 z-10"
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length) }}
                aria-label={t.feedCard.nextPhoto}
              >
                <ChevronRight size={24} />
              </button>
              <span className="absolute top-5 left-5 text-white/80 text-sm">{lightboxIndex + 1} / {photos.length}</span>
            </>
          )}
          <img
            src={photos[lightboxIndex]}
            alt={t.feedCard.mealPhotoAltSimple}
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {entry.caption && (
            <p className="absolute bottom-8 left-0 right-0 text-center text-white/80 text-sm px-8">
              {entry.caption}
            </p>
          )}
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

      {/* Long-press comment action sheet */}
      {menuComment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setMenuComment(null)}>
          <div className="w-full max-w-md bg-stone-900 border-t border-stone-700 rounded-t-3xl overflow-hidden mb-0" onClick={e => e.stopPropagation()}>
            <p className="text-stone-400 text-xs text-center pt-3 px-4 truncate">“{menuComment.text}”</p>
            <button
              onClick={() => startReply(menuComment)}
              className="w-full py-4 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              {t.feedCard.reply}
            </button>
            {menuComment.user_id === currentUserId && onDeleteComment && (
              <button
                onClick={() => deleteComment(menuComment)}
                disabled={deletingCommentId === menuComment.id}
                className="w-full py-4 text-red-400 text-sm font-semibold border-t border-stone-800 hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {deletingCommentId === menuComment.id ? t.feedCard.deleting : t.common.delete}
              </button>
            )}
            <button
              onClick={() => setMenuComment(null)}
              className="w-full py-4 text-stone-300 text-sm border-t border-stone-800 hover:bg-stone-800 transition-colors"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
