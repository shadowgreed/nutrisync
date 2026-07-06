import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LOCALE_COOKIE, resolveLocale, type Locale } from './index'

/** Current request's locale, from the preference cookie (server components). */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value)
}

/**
 * A specific user's language preference (`profiles.language`, migration 051),
 * for server code that acts on someone OTHER than the current request's user —
 * e.g. sending a push notification to its recipient. Defaults to English if
 * unset or the column isn't migrated yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserLocale(supabase: SupabaseClient<any, any, any>, userId: string): Promise<Locale> {
  try {
    const { data } = await supabase.from('profiles').select('language').eq('id', userId).maybeSingle()
    return resolveLocale((data as { language?: string | null } | null)?.language)
  } catch {
    return 'en'
  }
}
