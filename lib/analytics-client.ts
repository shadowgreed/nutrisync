import type { AppEventName } from './analytics'

// Fire-and-forget client analytics → /api/analytics/event. Never throws or blocks.
export function track(event: AppEventName, props: Record<string, unknown> = {}): void {
  try {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
