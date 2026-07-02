// Rate limiting for API routes, in two tiers:
//
//  - `rateLimit` — in-memory sliding window, per serverless instance. Zero
//    latency, but on Vercel each warm instance keeps its own counters, so the
//    effective global limit is (limit × instances).
//  - `rateLimitDurable` — the in-memory check first (fast local rejection),
//    then a shared Postgres counter via the `check_rate_limit` RPC (migration
//    050) that holds across instances. Fails OPEN if the RPC is missing or
//    errors, so deploying this code before applying the migration only means
//    falling back to the old per-instance behaviour — never a broken route.

import type { SupabaseClient } from '@supabase/supabase-js'

const buckets = new Map<string, number[]>()

// Drop stale buckets occasionally so long-lived instances don't grow forever.
let lastSweep = Date.now()
function sweep(windowMs: number) {
  const now = Date.now()
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || now - hits[hits.length - 1] > windowMs) buckets.delete(key)
  }
}

/**
 * In-memory (per-instance) limiter. Returns true if `key` (e.g.
 * `analyze:<userId>`) is within `limit` calls per `windowMs`, and records the
 * call. Returns false when over the limit.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  sweep(windowMs)
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}

// Remember when the shared counter isn't available (pre-migration) so we don't
// pay a failing round trip on every request from this instance.
let durableUnavailable = false

/**
 * Distributed limiter: in-memory first (free, catches single-instance abuse
 * immediately), then the shared Postgres window so the limit holds across all
 * serverless instances. Pass the route's existing per-request Supabase client.
 * Best-effort by design — any RPC failure falls back to the in-memory verdict.
 */
export async function rateLimitDurable(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (!rateLimit(key, limit, windowMs)) return false
  if (durableUnavailable) return true
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    })
    if (error) {
      // 42883 = undefined function → migration 050 not applied yet.
      if (error.code === '42883' || /check_rate_limit/.test(error.message)) durableUnavailable = true
      return true
    }
    return data !== false
  } catch {
    return true
  }
}
