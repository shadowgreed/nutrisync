import { NextResponse } from 'next/server'

/**
 * Request-body parsing + input bounds for API routes.
 *
 * Two problems these helpers solve (engineering audit H3/H4):
 *  - `await req.json()` throws on a malformed body → an unhandled 500 instead of
 *    a clean 400. `parseJson` returns null instead of throwing.
 *  - Numeric/string inputs were stored unbounded (negative durations, 500-char
 *    captions, unbounded photo arrays). The `bounded*` helpers clamp/cap them.
 */

/** Parse a JSON body. Returns the object, or null if the body is missing/invalid. */
export async function parseJson<T = Record<string, unknown>>(
  req: { json: () => Promise<unknown> },
): Promise<T | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as T) : null
  } catch {
    return null
  }
}

/** 400 response with a friendly default. */
export function badRequest(message = 'Invalid request body') {
  return NextResponse.json({ error: message }, { status: 400 })
}

/**
 * Coerce `v` to a finite number clamped to [min, max].
 * Returns null when the value is absent or non-numeric (so callers can treat
 * "not provided" distinctly from "0").
 */
export function boundedNumber(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

/** Trim a string and cap it at `maxLen`. Returns null for non-strings or empty. */
export function boundedString(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, maxLen) : null
}

/** Keep only https(:) string URLs, up to `maxLen` chars, capped to `maxCount` items. */
export function boundedUrlList(v: unknown, maxCount: number, maxLen = 2048): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((u): u is string => typeof u === 'string' && u.length <= maxLen && /^https?:\/\//.test(u))
    .slice(0, maxCount)
}
