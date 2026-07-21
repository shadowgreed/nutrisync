'use client'

import type { ReactNode } from 'react'

// Shared "selected tab/segment" control — one visual style app-wide (white
// fill, dark text) instead of the four different ad-hoc colors this used to
// be (docs/segmented-control-unification.md, audit PR-63 + PR-29). Exposes
// selection to assistive tech via role="tab"/aria-selected, which none of
// the markup it replaces did.
//
// Two variants, matched to the two shapes found across the app:
// - 'compact' (default): content-width pills in a shared padded pill wrapper
//   — date-range tabs, short 2-3 option switches.
// - 'fill': equal-width tabs spanning the full row, taller touch targets —
//   for primary top-level switchers (e.g. Log's food/activity tabs).
interface Option<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  disabled?: boolean
  variant?: 'compact' | 'fill'
}

export default function Segmented<T extends string>({
  options, value, onChange, ariaLabel, disabled = false, variant = 'compact',
}: Props<T>) {
  const isFill = variant === 'fill'
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={isFill ? 'flex gap-2' : 'flex rounded-lg bg-stone-800 p-0.5'}
    >
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={
            isFill
              ? `flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 ${
                  o.value === value ? 'bg-stone-100 text-stone-900' : 'bg-stone-800 text-stone-400 hover:text-white'
                }`
              : `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  o.value === value ? 'bg-stone-100 text-stone-900' : 'text-stone-300 hover:text-white'
                }`
          }
        >
          {o.icon && <span className="shrink-0 flex items-center" aria-hidden="true">{o.icon}</span>}
          {/* min-w-0 + truncate: 4-up fill rows (FeedCard meal tags) overflowed
              320px viewports with Spanish labels (audit NF-CLIENT-3). */}
          <span className={isFill ? 'truncate' : undefined}>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
