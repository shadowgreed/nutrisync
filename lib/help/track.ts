// Fire-and-forget Help Center analytics from the client. Never throws and never
// blocks the UI; if the user is logged out the endpoint 401s and we ignore it.

export type HelpEvent =
  | { type: 'search'; query: string; resultCount: number }
  | { type: 'view'; slug: string }
  | { type: 'feedback'; slug: string; helpful: boolean }

export function logHelpEvent(event: HelpEvent): void {
  try {
    fetch('/api/help/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
