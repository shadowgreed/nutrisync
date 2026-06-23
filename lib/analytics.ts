import type { SupabaseClient } from '@supabase/supabase-js'

// Core product analytics events. weekly_review_* and help_* have their own
// dedicated streams (weekly_review_events / help_events); everything else here.
export const APP_EVENTS = [
  'meal_logged',
  'activity_logged',
  'water_logged',
  'weight_logged',
  'group_created',
  'group_joined',
  'challenge_created',
  'challenge_completed',
] as const

export type AppEventName = (typeof APP_EVENTS)[number]

const ALLOWED = new Set<string>(APP_EVENTS)
export function isAppEvent(x: unknown): x is AppEventName {
  return typeof x === 'string' && ALLOWED.has(x)
}

/**
 * Record a product event for `userId`. Best-effort: never throws, so a logging
 * hiccup can't fail the action it accompanies. Used server-side (API routes);
 * the client uses lib/analytics-client `track()` → /api/analytics/event.
 */
export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  event: AppEventName,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('app_events').insert({ user_id: userId, event, props })
  } catch {
    /* analytics is best-effort */
  }
}
