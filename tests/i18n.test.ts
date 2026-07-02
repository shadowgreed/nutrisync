import { describe, it, expect } from 'vitest'
import { DICTS } from '@/lib/i18n/dictionaries'
import { isLocale, resolveLocale, htmlLang, getDict } from '@/lib/i18n'

// TypeScript enforces key parity (es: Dict = typeof en); this walks values too,
// catching empty strings and mismatched function/array shapes.
function walk(a: unknown, b: unknown, path: string, errors: string[]) {
  if (typeof a === 'string') {
    if (typeof b !== 'string' || b.trim() === '') errors.push(`${path}: empty or non-string in es`)
    return
  }
  if (typeof a === 'function') {
    if (typeof b !== 'function') errors.push(`${path}: not a function in es`)
    return
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) errors.push(`${path}: array length mismatch`)
    else a.forEach((v, i) => walk(v, b[i], `${path}[${i}]`, errors))
    return
  }
  if (a && typeof a === 'object') {
    for (const k of Object.keys(a)) {
      if (!(k in (b as object))) { errors.push(`${path}.${k}: missing in es`); continue }
      walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, errors)
    }
  }
}

describe('dictionaries', () => {
  it('es mirrors en exactly (keys, shapes, no empty strings)', () => {
    const errors: string[] = []
    walk(DICTS.en, DICTS.es, 'dict', errors)
    expect(errors).toEqual([])
  })

  it('parameterized entries interpolate in both languages', () => {
    expect(DICTS.en.onboarding.stepOf(2, 5)).toBe('Step 2 of 5')
    expect(DICTS.es.onboarding.stepOf(2, 5)).toBe('Paso 2 de 5')
    expect(DICTS.es.onboarding.revealTitle('Ana')).toContain('Ana')
    expect(DICTS.es.onboarding.bottlesPerDay(1, 16)).not.toContain('botellas') // singular
    expect(DICTS.es.onboarding.bottlesPerDay(3, 16)).toContain('botellas')
  })
})

describe('locale helpers', () => {
  it('isLocale / resolveLocale accept only supported locales', () => {
    expect(isLocale('es')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(resolveLocale('es')).toBe('es')
    expect(resolveLocale('junk')).toBe('en')
  })

  it('htmlLang maps Spanish to the Latin-American tag', () => {
    expect(htmlLang('es')).toBe('es-419')
    expect(htmlLang('en')).toBe('en')
  })

  it('getDict returns the matching dictionary', () => {
    expect(getDict('es').auth.signIn).toBe('Iniciar sesión')
    expect(getDict('en').auth.signIn).toBe('Sign in')
  })
})
