'use client'

import { useState } from 'react'
import { MessageCircle, Send, X, Trash2 } from 'lucide-react'
import type { FeedEntry, NutrientKey, MacroTotals } from '@/types'
import { NUTRIENT_META, NUTRIENT_KEYS } from '@/lib/nutrients'
import { MACRO_KEYS, MACRO_META, emptyMacros } from '@/lib/macros'
import MiniProfileModal from '@/components/MiniProfileModal'

const REACTION_EMOJIS = ['🍽️', '🔥', '🌿', '❓', '❤️']
const REACTION_NAMES: Record<string, string> = {
  '🍽️': 'tasty', '🔥': 'fire', '🌿': 'healthy', '❓': 'curious', '❤️': 'love',
}

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
  const [lightbox, setLightbox] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete(entry.id)
    } finally {
      setDeleting(false)
    }
  }

  const isOwnLog = entry.user_id === currentUserId
  const effectivePrivacy = entry.privacy_override ?? entry.profile.privacy_mode
  const myReaction = entry.reactions.find(r => r.user_id === currentUserId)
  const time = new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // Older posts saved a blob: URL that only existed in the author's browser
  // session — those are permanently dead, so skip them instead of rendering a
  // broken-image icon. New posts store a real Supabase Storage URL.
  const hasUsablePhoto = !!entry.photo_url && !entry.photo_url.startsWith('blob:')
  const showPhoto = hasUsablePhoto && effectivePrivacy !== 'dark'

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
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
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
                {MEAL_EMOJI[entry.meal_type] ?? ''} {entry.meal_type} · {time}
              </p>
            </div>
          </button>
          {isOwnLog && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-stone-800 text-stone-400 text-xs px-2 py-0.5 rounded-full">you</span>
              {onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-0.5 rounded-md bg-red-950/60 transition-colors disabled:opacity-50"
                    >
                      {deleting ? '…' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-stone-400 hover:text-stone-300 text-xs px-1 py-0.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete post"
                    className="text-stone-400 hover:text-red-400 transition-colors p-0.5"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Photo — edge-to-edge, clickable */}
        {showPhoto && (
          <button
            className="w-full block focus:outline-none"
            onClick={() => setLightbox(true)}
            aria-label="View full photo"
          >
            <img
              src={entry.photo_url!}
              alt="Meal photo"
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] object-cover"
            />
          </button>
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
                <span className="text-stone-400 text-xs">
                  <span className="text-white font-semibold">{entry.total_calories}</span> kcal
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

        {/* Reactions */}
        <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          {REACTION_EMOJIS.map(emoji => {
            const count = entry.reactions.filter(r => r.emoji === emoji).length
            const mine = myReaction?.emoji === emoji
            return (
              <button
                key={emoji}
                onClick={() => onReact(entry.id, emoji)}
                aria-pressed={mine}
                aria-label={`React ${REACTION_NAMES[emoji] ?? ''}${count > 0 ? `, ${count}` : ''}`}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-colors ${
                  mine
                    ? 'bg-emerald-800/60 border border-emerald-600'
                    : 'bg-stone-800 border border-stone-700 hover:border-stone-500'
                }`}
              >
                <span aria-hidden="true">{emoji}</span>
                {count > 0 && <span className="text-stone-300 text-xs">{count}</span>}
              </button>
            )
          })}
          <button
            onClick={() => setShowComments(v => !v)}
            aria-expanded={showComments}
            aria-label={`Comments${entry.comments.length > 0 ? `, ${entry.comments.length}` : ''}`}
            className={`ml-auto flex items-center gap-1.5 transition-colors text-sm px-2 py-2 ${
              showComments ? 'text-emerald-400' : 'text-stone-300 hover:text-white'
            }`}
          >
            <MessageCircle size={15} aria-hidden="true" />
            {entry.comments.length > 0 && (
              <span className="text-xs">{entry.comments.length}</span>
            )}
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
                <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 overflow-hidden">
                  {c.profile?.avatar_url
                    ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (c.profile?.display_name?.[0]?.toUpperCase() ?? '?')}
                </div>
                <div className="flex-1 bg-stone-800 rounded-xl px-3 py-2">
                  <p className="text-emerald-400 text-xs font-medium mb-0.5">{c.profile?.display_name}</p>
                  <p className="text-stone-200 text-sm leading-snug">{c.text}</p>
                </div>
              </div>
            ))}
            <form onSubmit={submitComment} className="flex gap-2 pt-1">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value.slice(0, 280))}
                placeholder="Add a comment…"
                className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submitting}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl px-3 transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && entry.photo_url && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X size={28} />
          </button>
          <img
            src={entry.photo_url}
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
