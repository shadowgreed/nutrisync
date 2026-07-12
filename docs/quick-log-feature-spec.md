# Quick Log — Feature Spec

**Feature:** Behavior-learned quick meal logging ("Recently logged" foods + one-tap "Log it again" meals)
**Date:** 2026-07-12 · **Status:** Proposal · **Grounded in:** `main` (`components/MealLogger.tsx`, `components/FoodSearchBar.tsx`, `app/api/log-meal/route.ts`, `types/index.ts`)

---

## 1. Summary

Reduce logging friction by surfacing what the user actually eats. Two surfaces inside the existing meal logger:

1. **Recent foods** — a ranked list of the user's most-logged foods for the *current meal type* (breakfast suggestions at 8am), each addable with one tap at their usual portion.
2. **Log it again** — the user's most common full meals for that meal type; one tap pre-fills the entire food list.

Everything is derived from data already stored: every `food_logs` row carries the full `foods: FoodEntry[]` JSONB (name, calories, macros, nutrients, serving size, portion model). **No new tracking, no schema migration, no AI calls.**

## 2. Core design decision: no new write path

Quick log only **pre-fills MealLogger state**. Saving still goes through the existing `POST /api/log-meal`. This inherits, for free: the 15s idempotency dedupe, streak-milestone logic, group push fan-out, `meal_logged` analytics, validation, and RLS. The only new backend surface is one **read-only** endpoint. This is the cheapest and safest version of this feature; do not build a separate "instant log" write route in v1.

## 3. Ranking model (v1 — no AI)

Computed server-side from the user's own last 60 days of `food_logs` (already covered by the migration-044 `user_id + logged_at` index).

For each distinct food (normalized: lowercase, trimmed, collapsed whitespace):

```
score = frequency × recencyDecay × mealAffinity
```

- **frequency** — number of logs containing the food in the window.
- **recencyDecay** — `exp(-daysSinceLastLogged / 14)` (half-life ≈ 2 weeks; drops foods the user stopped eating).
- **mealAffinity** — `1 + P(food appears in requested meal_type | food logged)`. Oatmeal logged 90% at breakfast scores ~2× for breakfast, ~1× for dinner.

Each suggestion carries the **most recently used portion** (`servingSizeG`, `baseServingG`, `sizeFactor`, `quantity`) as its default — "your usual amount," adjustable with the existing S/M/L + quantity controls.

**Meals** ("Log it again"): group past logs of the requested meal_type by the sorted set of normalized food names; rank groups by the same frequency × recency formula; return top 3 with a display label ("Boiled egg + Whole wheat bread + 1 more"), total calories, and the full `FoodEntry[]` from the most recent instance.

Return top **8 foods** and top **3 meals**. If history is empty, return empty arrays; the UI renders nothing (no cold-start clutter for new users).

## 4. API

`GET /api/quick-log?meal=<breakfast|lunch|dinner|snack>`

- Auth: standard `createClient()` → `getUser()` → 401, same as every route.
- Reads only the caller's own rows (RLS-safe by construction).
- Query: `select('meal_type, logged_at, foods').eq('user_id', user.id).gte('logged_at', <60d>).limit(500)` — bounded, one indexed query.
- Rate limit with the existing `rateLimitDurable` (it's a read, but cheap protection is one line — 13 routes already use it).
- `Cache-Control: private, max-age=300` — suggestions don't need to be fresher than 5 minutes, and this is currently only the second route in the app to set a cache header (audit PR-44).
- Errors: `{ error: string }`, matching the app-wide shape.

Response:

```ts
{
  foods: Array<{ entry: FoodEntry; timesLogged: number; lastLoggedAt: string }>,
  meals: Array<{ label: string; totalCalories: number; entries: FoodEntry[]; timesLogged: number }>
}
```

## 5. Code placement

| Piece | Location | Notes |
|---|---|---|
| Ranking logic | `lib/quick-log.ts` | Pure functions (`rankFoods(logs, mealType)`, `rankMeals(...)`) — framework-free, matching the `lib/` convention, and directly unit-testable |
| API route | `app/api/quick-log/route.ts` | Thin: auth → query → call lib → respond |
| UI | `components/QuickLogSuggestions.tsx` | **New component, not more lines in MealLogger.** MealLogger's sibling FeedCard/CoachMemberClient god-component problem (audit PR-08) started exactly this way |
| Wiring | `components/MealLogger.tsx` | Render `<QuickLogSuggestions mealType={mealType} onAddFood={f => setFoods(p => [...p, initFood(f)])} onAddMeal={...} />` above the FoodSearchBar row; refetch when `mealType` changes |

`initFood()` already normalizes `baseServingG`/`sizeFactor`/`quantity`, so quick-added foods get working portion controls with zero extra code.

## 6. UI behavior

- Section header "Your usual" (collapsible), shown only when suggestions exist.
- Food rows: name, usual portion + kcal, a `+` add button — visually consistent with FoodSearchBar result rows.
- "Log it again" cards above the food rows: meal label, total kcal, one-tap adds all entries (appends; doesn't clear foods already staged).
- Tapping `+` gives immediate feedback and **announces via an `aria-live="polite"` region** ("Added boiled egg, 78 calories"). Status messages being visual-only is an app-wide WCAG 4.1.3 failure (audit PR-26) — don't extend the pattern to new code.
- Real `<button>` elements with `aria-label`s (avoid repeating the FoodSearchBar non-semantic-rows gap, audit PR-62).
- New strings go in **both** `en` and `es-419` dictionaries — the typed parity check will fail the build otherwise.

## 7. Analytics

Fire one new event via the existing `logEvent`: `quick_log_used` with `{ source: 'recent_food' | 'repeat_meal', meal_type }`. Also add `suggestions_shown` on render if you want a true conversion funnel. This is the feature's success metric (see §10) and a small down payment on the audit's analytics-coverage gap (PR-69).

## 8. Edge cases

- **Photo-analyzed foods** have no stable `fdcId` — that's why dedupe keys on normalized name, not id.
- **Same food, different portions** — last-used portion wins as the default; the score still aggregates across portions.
- **Foods list already populated** — suggestions append rather than replace; MealLogger's existing per-row remove handles mistakes.
- **Deleted/edited logs** — next fetch (≤5 min cache) reflects them; no invalidation machinery needed at v1.
- **Locale** — food names are stored as logged; suggestions surface the user's own strings, so no translation issue.

## 9. Interaction with the audit (do these matter here?)

- **PR-28 (client-trusted nutrition numbers)** — quick log re-sends nutrition values from history through the same client-trusted `POST /api/log-meal` body. It doesn't worsen the exposure, but it's one more flow riding on it; the 2h server-side bounds fix should land regardless.
- **PR-23 (zero AI caching)** — quick log naturally *reduces* Claude spend: a user who taps "Boiled egg" never hits `/api/search-food` → `estimateFoodNutrition`. Friction win and cost win.
- **PR-01/PR-02 (the P0 RLS bugs)** — unrelated to this feature, but note this feature makes the app stickier and grows usage; shipping growth features before the P0 access-control fixes increases the exposed surface. Recommend landing PR-01/02/06 (≈6–8h combined) in the same sprint.

## 10. Success metrics

- % of logged meals using quick log (target: >30% within 4 weeks for users with ≥1 week history)
- Median time-to-log (open logger → save) for quick-log vs. search/photo flows
- D7/D30 logging retention for quick-log adopters vs. non-adopters
- `/api/search-food` call volume per active user (expect a drop = AI cost savings)

## 11. Effort estimate

| Work item | Estimate |
|---|---|
| `lib/quick-log.ts` ranking + unit tests | 6–8h |
| `app/api/quick-log/route.ts` | 2–3h |
| `QuickLogSuggestions.tsx` + MealLogger wiring | 6–8h |
| i18n strings (en + es-419) | 1h |
| Analytics events | 1h |
| **Total** | **~16–21h** |

No migration, no new dependencies, no AI cost.

## 12. Explicitly out of scope (v2 candidates)

- **Saved "My Meals" / recipes** (user-curated, needs a new table + CRUD) — the natural next step once quick-log usage proves demand.
- **AI-predicted suggestions** — adds cost/latency to a flow whose whole point is being instant; revisit only if the SQL ranking measurably underperforms.
- **Voice log** (per the reference screenshot) — separate feature, separate spec.
- **Rollup/materialized suggestion table** — only needed if the 60-day query shows up in slow logs; it won't at current scale.
