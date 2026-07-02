'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { getDict, DEFAULT_LOCALE, LOCALE_COOKIE, type Dict, type Locale } from '@/lib/i18n'

const I18nContext = createContext<{ locale: Locale; t: Dict }>({
  locale: DEFAULT_LOCALE,
  t: getDict(DEFAULT_LOCALE),
})

/** Mounted once in the root layout with the locale read server-side, so server
 *  and client render the same language (no hydration mismatch). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, t: getDict(locale) }}>
      {children}
    </I18nContext.Provider>
  )
}

/** `const { t, locale } = useI18n()` → `t.settings.title` etc. */
export function useI18n() {
  return useContext(I18nContext)
}

/** Persist the device-level preference. Callers should `router.refresh()` after
 *  so the server re-renders in the new language. */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}
