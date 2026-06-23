import { Sparkles } from 'lucide-react'

// Required AI disclosure shown wherever AI-estimated nutrition is presented
// (App Store 1.4/5.2.3, Google Play AI-Generated Content policy). Two sizes:
// a full banner near results, and an inline one-liner under summaries.
export default function AiDisclaimer({ variant = 'banner' }: { variant?: 'banner' | 'inline' }) {
  if (variant === 'inline') {
    return (
      <p className="text-stone-500 text-[11px] leading-snug">
        AI-estimated — may not be exact. Not medical advice.
      </p>
    )
  }
  return (
    <div className="flex items-start gap-2 bg-stone-800/40 border border-stone-700/60 rounded-xl px-3 py-2">
      <Sparkles size={13} className="text-stone-400 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-stone-400 text-[11px] leading-snug">
        Nutrition values are <span className="text-stone-300">estimated by AI</span> and may not be perfectly accurate. NutriSync is a wellness tool, not medical advice.
      </p>
    </div>
  )
}
