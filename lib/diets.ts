import type { Diet, NutrientKey } from '@/types'

// ── Diet knowledge ────────────────────────────────────────────────────────────
// What diet a member follows + which micronutrients naturally run lower on it, so
// the Copilot acknowledges an expected gap (e.g. a vegan's B12) instead of flagging
// it to the coach as "something is missing".

export const DIETS: Diet[] = [
  'omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto',
  'paleo', 'mediterranean', 'carnivore', 'gluten_free', 'dairy_free',
]

export const DIET_LABELS: Record<Diet, string> = {
  omnivore: 'Omnivore',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  keto: 'Keto / Low-carb',
  paleo: 'Paleo',
  mediterranean: 'Mediterranean',
  carnivore: 'Carnivore',
  gluten_free: 'Gluten-free',
  dairy_free: 'Dairy-free',
}

export const DIET_EMOJIS: Record<Diet, string> = {
  omnivore: '🍽️', vegetarian: '🥗', vegan: '🌱', pescatarian: '🐟', keto: '🥑',
  paleo: '🍖', mediterranean: '🫒', carnivore: '🥩', gluten_free: '🌾', dairy_free: '🥛',
}

// Micronutrients (of the 10 we track) that commonly run lower on each diet by
// design — not a coaching concern, just a known characteristic to acknowledge.
export const DIET_EXPECTED_LOW: Record<Diet, NutrientKey[]> = {
  omnivore: [],
  mediterranean: [],
  vegetarian: ['b12', 'iron', 'omega3'],
  vegan: ['b12', 'vitamin_d', 'iron', 'calcium', 'omega3', 'zinc'],
  pescatarian: ['iron'],
  keto: ['vitamin_c', 'folate', 'potassium'],
  paleo: ['calcium'],
  carnivore: ['vitamin_c', 'folate', 'magnesium'],
  gluten_free: ['folate', 'iron'],
  dairy_free: ['calcium', 'vitamin_d'],
}

export function isDiet(v: unknown): v is Diet {
  return typeof v === 'string' && (DIETS as string[]).includes(v)
}

export function dietExpectedLow(diet: Diet | null | undefined): NutrientKey[] {
  return diet ? (DIET_EXPECTED_LOW[diet] ?? []) : []
}

export function dietLabel(diet: Diet | null | undefined): string {
  return diet ? DIET_LABELS[diet] : 'No specific diet'
}

/** The diet that applies to a member: a coach override wins, else the member's own. */
export function effectiveDiet(memberDiet: Diet | null | undefined, override: Diet | null | undefined): Diet | null {
  return override ?? memberDiet ?? null
}
