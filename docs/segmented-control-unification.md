# Unify the selected-state pattern (fixes audit PR-63 + PR-29)

**Status:** Proposal · **Effort:** ~2–3h · **Risk:** Low (mechanical, presentational)
**Date:** 2026-07-12

## The problem

The app has four different "selected" styles for the same control pattern, one per screen:

| Screen | Selected style today |
|---|---|
| Trends period tabs | `bg-stone-600` |
| Log tabs | `bg-emerald-700` |
| MealLogger S/M/L portions | `bg-emerald-600` |
| Coach tabs | `bg-stone-100` |

Two costs. First, users re-learn what "selected" looks like on every screen. Second, none of these controls expose selection to assistive tech — no `role="tab"`, no `aria-selected` — which is a WCAG 1.3.1 / 4.1.2 failure flagged on 8+ screens in the July 6 audit (PR-29).

## The decision

One selected style, app-wide: **white fill, dark text** (`bg-stone-100 text-stone-900`) — the pattern the Coach screen already uses. Chosen deliberately:

- Highest-contrast selection signal; readable at a glance in a dark UI.
- Frees emerald to mean **actions and positive data only**. Today emerald means both "selected" and "go", which dilutes the accent.
- Stays inside the existing stone palette — no new colors, no theme work.

## The implementation

One new shared component. It fixes the visual inconsistency and the ARIA gap in the same stroke.

```tsx
// components/Segmented.tsx
'use client'

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
```

Notes for the implementer:

- For toggle-style chip groups that aren't mutually exclusive tabs (e.g. multi-select filters), use `aria-pressed` on plain buttons instead of `role="tab"` — don't force everything into tablist semantics.
- The MealLogger S/M/L group currently uses `aria-pressed` and `role="group"` — acceptable to keep those semantics; just adopt the unified selected classes.
- Add arrow-key navigation between tabs later if desired; not required for this PR.

## Migration sweep

Replace the ad-hoc chip/tab markup with `<Segmented>` (or the unified classes, where semantics differ) in:

- [ ] `app/trends/TrendsClient.tsx` (period tabs)
- [ ] `app/log/LogClient.tsx` (log-type tabs)
- [ ] `components/MealLogger.tsx` (S/M/L portion group — classes only)
- [ ] `app/coach/CoachClient.tsx` (already white — adopt component for consistency)
- [ ] `app/coach/CoachMemberClient.tsx`
- [ ] `app/profile/ProfileClient.tsx`
- [ ] `app/privacy/PrivacyClient.tsx`
- [ ] `app/onboarding/page.tsx` (option chips)
- [ ] `components/FoodSearchBar.tsx` (filter chips, if any)

Grep to catch stragglers: `rg "bg-stone-600|bg-emerald-700 |bg-emerald-600 " app components` and review each hit that styles a selected state.

## Explicitly out of scope

- **No palette change.** The warm stone greys stay (decision: cool charcoal was evaluated against a Settle-style reference and rejected — wrong fit for food content, and a 100-file diff for zero user benefit).
- No design-token refactor in this PR — that's a separate backlog item and the enabler for any future theming/light mode.

## Acceptance criteria

- [ ] Every tab/segment control in the app shows the same selected style (white fill, dark text)
- [ ] Emerald no longer appears as a "selected" indicator anywhere — only on actions/positive data
- [ ] Screen reader announces selection state on every migrated control (VoiceOver spot-check)
- [ ] No visual regression in the unselected/hover states
