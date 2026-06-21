// Fire-and-forget Weekly Review analytics from the client. Never throws or blocks.

export type ReviewEventName =
  | 'weekly_review_opened'
  | 'weekly_review_slide_viewed'
  | 'weekly_review_completed'
  | 'weekly_review_shared'
  | 'weekly_review_paused'
  | 'weekly_review_dismissed'
  | 'weekly_review_mission_accepted'
  | 'weekly_review_group_comparison_viewed'

export function logReviewEvent(event: ReviewEventName, opts?: { slide?: string; weekKey?: string }): void {
  try {
    fetch('/api/weekly-review/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...opts }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
