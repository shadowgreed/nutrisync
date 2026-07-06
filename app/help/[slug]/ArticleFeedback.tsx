'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { logHelpEvent } from '@/lib/help/track'
import { useI18n } from '@/components/I18nProvider'

// Records an article view on mount and captures Helpful / Not Helpful feedback.
export default function ArticleFeedback({ slug }: { slug: string }) {
  const { t } = useI18n()
  const h = t.help
  const [voted, setVoted] = useState<boolean | null>(null)

  useEffect(() => {
    logHelpEvent({ type: 'view', slug })
  }, [slug])

  function vote(helpful: boolean) {
    if (voted !== null) return
    setVoted(helpful)
    logHelpEvent({ type: 'feedback', slug, helpful })
  }

  if (voted !== null) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-center">
        <p className="text-stone-300 text-sm">{h.thanksForFeedback}</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-stone-300 text-sm">{h.wasThisHelpful}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => vote(true)}
          aria-label={h.yesHelpfulAria}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-stone-800 hover:bg-emerald-900/50 text-stone-300 hover:text-emerald-300 border border-stone-700 transition-colors"
        >
          <ThumbsUp size={16} aria-hidden="true" />
        </button>
        <button
          onClick={() => vote(false)}
          aria-label={h.noHelpfulAria}
          className="flex items-center justify-center w-11 h-11 rounded-xl bg-stone-800 hover:bg-red-900/40 text-stone-300 hover:text-red-300 border border-stone-700 transition-colors"
        >
          <ThumbsDown size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
