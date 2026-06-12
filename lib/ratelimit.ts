// Minimal in-memory sliding-window rate limiter for API routes.
//
// Scope: per serverless instance. On Vercel each warm instance keeps its own
// counters, so the effective global limit is (limit × instances) — imperfect,
// but it stops the realistic abuse case (one user/script hammering an endpoint
// through a single warm instance) with zero added latency or infrastructure.

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
 * Returns true if `key` (e.g. `analyze:<userId>`) is within `limit` calls per
 * `windowMs`, and records the call. Returns false when over the limit.
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
