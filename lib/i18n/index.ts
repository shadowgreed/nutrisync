import { DICTS, type Dict } from './dictionaries'

// The user's language preference lives in two places, deliberately:
//  - the `nutrisync_locale` cookie — works pre-auth (login/signup render in the
//    chosen language) and lets the server layout pick the locale per request;
//  - `profiles.language` (migration 051) — the durable, cross-device source of
//    truth. Login copies profile → cookie; signup copies cookie → profile.

export type Locale = 'en' | 'es'
export const LOCALES: Locale[] = ['en', 'es']
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'nutrisync_locale'

export function isLocale(x: unknown): x is Locale {
  return x === 'en' || x === 'es'
}

export function resolveLocale(x: unknown): Locale {
  return isLocale(x) ? x : DEFAULT_LOCALE
}

export function getDict(locale: Locale): Dict {
  return DICTS[locale]
}

// BCP-47 tag for <html lang>. Spanish targets Latin America.
export function htmlLang(locale: Locale): string {
  return locale === 'es' ? 'es-419' : 'en'
}

export type { Dict }
