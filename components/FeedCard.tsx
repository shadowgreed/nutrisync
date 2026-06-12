'use client'

import { useState } from 'react'
import { Heart, MessageCircle, Send, X, Trash2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FeedEntry, NutrientKey, MacroTotals } from '@/types'
import { NUTRIENT_META, NUTRIENT_KEYS } from '@/lib/nutrients'
import { MACRO_KEYS, MACRO_META, emptyMacros } from '@/lib/macros'
import MiniProfileModal from '@/components/MiniProfileModal'

const HEART = '❤️'

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
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

function shortAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
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
  onComment: (logId: string, text: string) => Promise<void>
  onDelete?: (logId: string) => Promise<void>
}

export default function FeedCard({ entry, currentUserId, onReact, onComment, onDelete }: Props) {
  const [showComments, setShowComments] = useState(false)
  const [showNutrients, setShowNutrients] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareNote, setShareNote] = useState('')

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } finally {
      setDeleting(false)
    }
  }

  async function handleShare() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const shareUrl = photos[0] ?? `${origin}/feed`
    const text = entry.caption || `${entry.profile.display_name}'s ${entry.meal_type} on NutriSync 🌿`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'NutriSync', text, url: shareUrl })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setShareNote('Link copied!')
        setTimeout(() => setShareNote(''), 1800)
      }
    } catch { /* user cancelled the share sheet */ }
  }

  const isOwnLog = entry.user_id === currentUserId
  const effectivePrivacy = entry.privacy_override ?? entry.profile.privacy_mode
  // Single heart reaction: any reaction row counts as a like.
  const liked = entry.reactions.some(r => r.user_id === currentUserId)
  const likeCount = entry.reactions.length
  const time = new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // Older posts saved blob: URLs that only existed in the author's browser session —
  // those are permanently dead, so skip them. Newer posts may have multiple photos.
  const photos = (entry.photo_urls?.length ? entry.photo_urls : entry.photo_url ? [entry.photo_url] : [])
    .filter(u => !!u && !u.startsWith('blob:'))
  const showPhoto = photos.length > 0 && effectivePrivacy !== 'dark'

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
    await onComment(entry.id, commentText.trim())
    setCommentText('')
    setSubmitting(false)
  }

  return (
    <>
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-lg shadow-black/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            onClick={() => !isOwnLog && setShowProfile(true)}
            disabled={isOwnLog}
            aria-label={isOwnLog ? undefined : `View ${entry.profile.display_name}'s profile`}
            className={`flex items-center gap-3 flex-1 min-w-0 text-left ${isOwnLog ? '' : 'group'}`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
              {entry.profile.avatar_url
                ? <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : entry.profile.display_name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-white font-semibold text-sm truncate ${isOwnLog ? '' : 'group-hover:text-emerald-300 transition-colors'}`}>{entry.profile.display_name}</p>
              <p className="text-stone-400 text-xs">
                {/* Meal type lives on the photo badge; only repeat it here when there's no photo */}
                {showPhoto ? time : `${MEAL_EMOJI[entry.meal_type] ?? ''} ${entry.meal_type} · ${time}`}
              </p>
            </div>
          </button>
          {isOwnLog && onDelete && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Post options"
                aria-expanded={menuOpen}
                className="text-stone-400 hover:text-white transition-colors p-1.5 -mr-1.5"
              >
                <MoreVertical size={18} aria-hidden="true" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false) }} />
                  <div className="absolute right-0 top-9 z-20 w-44 bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
                    {confirmDelete ? (
                      <div className="p-2.5">
                        <p className="text-stone-300 text-xs px-1 pb-2">Delete this post? This can&apos;t be undone.</p>
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 bg-red-900/70 hover:bg-red-900 text-red-100 text-xs font-semibold py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting ? '…' : 'Delete'}
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
                        <Trash2 size={15} aria-hidden="true" /> Delete post
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Photo(s) — single image or a swipeable carousel, with a meal badge */}
        {showPhoto && (
          <div className="relative">
            <div className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative w-full shrink-0 snap-center block focus:outline-none"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`View photo ${i + 1} of ${photos.length}`}
                >
                  <img
                    src={url}
                    alt={`Meal photo ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/3] object-cover"
                  />
                </button>
              ))}
            </div>
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full capitalize pointer-events-none">
              <span aria-hidden="true">{MEAL_EMOJI[entry.meal_type] ?? ''}</span> {entry.meal_type}
            </span>
            {photos.length > 1 && (
              <span className="absolute top-3 right-3 bg-black/55 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full pointer-events-none">
                1/{photos.length}
              </span>
            )}
          </div>
        )}

        {/* Caption */}
        {entry.caption && (
          <p className="px-4 pt-3 text-stone-200 text-sm leading-relaxed">
            {entry.caption}
          </p>
        )}

        {/* Calories + nutrient section — shown unless dark mode */}
        {effectivePrivacy !== 'dark' && (
          <div className="px-4 pt-3">
            {/* Calorie + macro summary — always visible if available */}
            {entry.total_calories > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="inline-flex items-center gap-1 bg-stone-800 rounded-full px-2.5 py-1 text-xs">
                  <span className="text-white font-bold tabular-nums">{entry.total_calories}</span>
                  <span className="text-stone-400">kcal</span>
                </span>
                {(() => {
                  const m = (entry.macro_totals as MacroTotals) ?? emptyMacros()
                  const hasMacros = MACRO_KEYS.some(k => (m[k] ?? 0) > 0)
                  if (!hasMacros) return null
                  return MACRO_KEYS.map(k => (
                    <span key={k} className="text-stone-400 text-xs flex items-center gap-0.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${MACRO_META[k].color}`} />
                      {Math.round(m[k] ?? 0)}{MACRO_META[k].unit} {MACRO_META[k].label}
                    </span>
                  ))
                })()}
              </div>
            )}

            {!hasNutrientData ? (
              /* No nutrient data — logged before tracking was enabled */
              <p className="text-stone-700 text-xs mb-3">Nutrient breakdown not available for this meal</p>
            ) : (
              <>
                {/* "Rich in" highlights — top nutrients this meal provides */}
                {richIn.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {richIn.map(n => (
                      <span
                        key={n.key}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                          n.status === 'great'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                            : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/40'
                        }`}
                      >
                        {n.meta.emoji} {n.meta.label}
                        <span className={`${n.status === 'great' ? 'text-emerald-500' : 'text-yellow-500'} font-bold`}>
                          {n.pct}%
                        </span>
                      </span>
                    ))}
                    <button
                      onClick={() => setShowNutrients(v => !v)}
                      className="text-stone-400 hover:text-stone-400 text-xs underline underline-offset-2 transition-colors ml-1"
                    >
                      {showNutrients ? 'less' : `all ${NUTRIENT_KEYS.length}`}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNutrients(v => !v)}
                    className="text-stone-400 hover:text-stone-400 text-xs mb-2 transition-colors"
                  >
                    {showNutrients ? '▲ hide nutrients' : '▼ show nutrients'}
                  </button>
                )}

                {/* Full nutrient breakdown — expandable */}
                {showNutrients && (
                  <div className="bg-stone-800/50 rounded-xl p-3 mb-3 space-y-2">
                    {nutrientData.map(n => (
                      <div key={n.key} className="flex items-center gap-2">
                        <span className="text-base w-5 text-center shrink-0">{n.meta.emoji}</span>
                        <span className="text-stone-400 text-xs w-20 shrink-0">{n.meta.label}</span>
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
                    <p className="text-stone-400 text-xs text-right pt-1">% of daily target per serving</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Actions — heart · comment · share */}
        <div className="px-4 py-3 mt-1 border-t border-stone-800/70 flex items-center gap-4">
          <button
            onClick={() => onReact(entry.id, HEART)}
            aria-pressed={liked}
            aria-label={`Like${likeCount > 0 ? `, ${likeCount}` : ''}`}
            className="flex items-center gap-1.5 transition-colors group/like"
          >
            <Heart
              size={22}
              className={`transition-all ${liked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-stone-300 group-hover/like:text-rose-400'}`}
              aria-hidden="true"
            />
            {likeCount > 0 && <span className={`text-sm ${liked ? 'text-rose-300' : 'text-stone-300'}`}>{likeCount}</span>}
          </button>

          <button
            onClick={() => setShowComments(v => !v)}
            aria-expanded={showComments}
            aria-label={`Comments${entry.comments.length > 0 ? `, ${entry.comments.length}` : ''}`}
            className={`flex items-center gap-1.5 transition-colors ${showComments ? 'text-emerald-400' : 'text-stone-300 hover:text-white'}`}
          >
            <MessageCircle size={21} aria-hidden="true" />
            {entry.comments.length > 0 && <span className="text-sm">{entry.comments.length}</span>}
          </button>

          <button
            onClick={handleShare}
            aria-label="Share"
            className="flex items-center gap-1.5 text-stone-300 hover:text-white transition-colors"
          >
            <Send size={20} aria-hidden="true" />
            {shareNote && <span className="text-emerald-400 text-xs">{shareNote}</span>}
          </button>
        </div>

        {/* Collapsed teaser — Instagram style */}
        {!showComments && entry.comments.length > 0 && (
          <button
            onClick={() => setShowComments(true)}
            className="block w-full text-left px-4 pb-3 -mt-1 text-stone-400 hover:text-stone-200 text-xs transition-colors"
          >
            View {entry.comments.length === 1 ? '1 comment' : `all ${entry.comments.length} comments`}
          </button>
        )}

        {/* Comments */}
        {showComments && (
          <div className="border-t border-stone-800 px-4 py-3 space-y-3">
            {entry.comments.length === 0 && (
              <p className="text-stone-400 text-xs text-center py-1">No comments yet — be first!</p>
            )}
            {entry.comments.map(c => (
              <div key={c.id} className="flex gap-2.5 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                  {c.profile?.avatar_url
                    ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (c.profile?.display_name?.[0]?.toUpperCase() ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="text-white font-semibold mr-1.5">{c.profile?.display_name ?? 'User'}</span>
                    <span className="text-stone-200">{c.text}</span>
                  </p>
                  <p className="text-stone-500 text-[11px] mt-0.5">{shortAgo(c.created_at)}</p>
                </div>
              </div>
            ))}
            <form onSubmit={submitComment} className="flex gap-2 pt-1">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, 280))}
                placeholder="Add a comment…"
                className="flex-1 bg-stone-800 border border-stone-700 rounded-full px-4 py-2.5 text-white text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X size={28} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/40 rounded-full p-2 z-10"
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length) }}
                aria-label="Previous photo"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/40 rounded-full p-2 z-10"
                onClick={e => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % photos.length) }}
                aria-label="Next photo"
              >
                <ChevronRight size={24} />
              </button>
              <span className="absolute top-5 left-5 text-white/80 text-sm">{lightboxIndex + 1} / {photos.length}</span>
            </>
          )}
          <img
            src={photos[lightboxIndex]}
            alt="Meal photo"
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
        <MiniProfileModal userId={entry.user_id} name={entry.profile.display_name} onClose={() => setShowProfile(false)} />
      )}
    </>
  )
}
