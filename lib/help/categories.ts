import type { HelpCategory, CategoryId } from './types'

// The eight Help Center sections, in display order.
export const CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', title: 'Getting Started', emoji: '🚀', description: 'New here? Start with the basics.' },
  { id: 'food-logging', title: 'Food Logging', emoji: '🍽️', description: 'Log meals, photos, macros and nutrients.' },
  { id: 'activity', title: 'Activity Tracking', emoji: '🏃', description: 'Workouts, steps, distance and calorie burn.' },
  { id: 'groups', title: 'Groups', emoji: '👥', description: 'Create groups, invite friends, stay accountable.' },
  { id: 'challenges', title: 'Challenges', emoji: '🏆', description: 'Run challenges and friendly competition.' },
  { id: 'progress', title: 'Progress & Trends', emoji: '📈', description: 'Streaks, weight trends and weekly recaps.' },
  { id: 'account', title: 'Account & Billing', emoji: '⚙️', description: 'Profile, notifications and subscription.' },
  { id: 'troubleshooting', title: 'Troubleshooting', emoji: '🛠️', description: 'Fix problems and answer "why did that happen?"' },
]

const BY_ID: Record<string, HelpCategory> = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export function getCategory(id: CategoryId): HelpCategory {
  return BY_ID[id]
}
