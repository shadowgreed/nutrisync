import { cookies } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale, type Locale } from './index'

/** Current request's locale, from the preference cookie (server components). */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value)
}
