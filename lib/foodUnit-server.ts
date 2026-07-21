import { cookies } from 'next/headers'
import { FOOD_UNIT_COOKIE, isFoodUnit } from './foodUnit'
import type { FoodUnit } from '@/types'

/**
 * Resolve the current request's food-unit preference (server components).
 * Mirrors lib/i18n/server.ts's getLocale, with one addition: the account
 * column (profiles.food_unit, migration 055) wins when present, because it
 * syncs across devices; the cookie set by /api/food-unit covers everything
 * else — including databases where migration 055 hasn't been applied yet,
 * which is exactly why the preference must never depend on the column alone.
 *
 * Pass whatever the page's profile fetch returned for food_unit (undefined
 * when the column is missing or unset — callers should fetch the profile row
 * with select('*') so a missing column degrades to undefined instead of
 * failing the whole query).
 */
export async function getFoodUnit(accountValue?: unknown): Promise<FoodUnit> {
  if (isFoodUnit(accountValue)) return accountValue
  const jar = await cookies()
  const fromCookie = jar.get(FOOD_UNIT_COOKIE)?.value
  return isFoodUnit(fromCookie) ? fromCookie : 'g'
}
