// Food serving sizes are stored canonically in grams (FoodEntry.servingSizeG),
// but some users think in ounces when picturing a portion. These helpers
// convert for display/input — profiles.food_unit (migration 055) is the
// account-level preference, set in Settings → Edit Profile.
//
// This is the food-WEIGHT ounce (avoirdupois, 1 lb / 16), not lib/water.ts's
// fluid ounce (29.5735 ml) — the two units share a name and nothing else.

import type { FoodUnit } from '@/types'

// Device-level mirror of the preference, set server-side by /api/food-unit
// (Set-Cookie survives Safari's 7-day cap on JS-written cookies — same
// reasoning as LOCALE_COOKIE). The cookie is what makes the preference work
// even before migration 055 exists in the database; profiles.food_unit is the
// cross-device upgrade on top. Server reads resolve account value → cookie →
// 'g' (see lib/foodUnit-server.ts).
export const FOOD_UNIT_COOKIE = 'nutrisync_food_unit'

export function isFoodUnit(x: unknown): x is FoodUnit {
  return x === 'g' || x === 'oz'
}

export const G_PER_OZ = 28.3495

export function gToOz(g: number): number {
  return Math.round((g / G_PER_OZ) * 10) / 10
}

export function ozToG(oz: number): number {
  return Math.round(oz * G_PER_OZ)
}

/** Grams -> the number to show in an editable serving-size input. */
export function servingForDisplay(g: number, unit: FoodUnit): number {
  return unit === 'oz' ? gToOz(g) : Math.round(g)
}

/** The number typed into a serving-size input (already in `unit`) -> grams,
 *  for storage and macro/calorie scaling (which always operate in grams). */
export function servingFromDisplay(value: number, unit: FoodUnit): number {
  return unit === 'oz' ? ozToG(value) : Math.round(value)
}

/** Read-only "150 g" / "5.3 oz" label. */
export function formatServing(g: number, unit: FoodUnit): string {
  return `${servingForDisplay(g, unit)} ${unit}`
}
