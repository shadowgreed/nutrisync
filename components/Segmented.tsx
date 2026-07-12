'use client'

// Shared "selected tab/segment" control — one visual style app-wide (white
// fill, dark text) instead of the four different ad-hoc colors this used to
// be (docs/segmented-control-unification.md, audit PR-63 + PR-29). Exposes
// selection to assistive tech via role="tab"/aria-selected, which none of
// the markup it replaces did.
interface Props<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}

export default function Segmented<T extends string>({ options, value, onChange, ariaLabel }: Props<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex rounded-lg bg-stone-800 p-0.5">
      {options.map(o => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            o.value === value
              ? 'bg-stone-100 text-stone-900'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
