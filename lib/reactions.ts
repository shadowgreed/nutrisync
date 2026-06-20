// Canonical quick-reaction set for cheering a group member from their profile.
// Shared by the client (MiniProfileModal chips) and the server (/api/cheer),
// so the API never has to trust an emoji/label supplied by the caller — it
// looks the reaction up by id and uses these exact values.

export interface CheerReaction {
  id: string
  emoji: string
  label: string
}

export const CHEER_REACTIONS: CheerReaction[] = [
  { id: 'nice_job',     emoji: '👏', label: 'Nice Job' },
  { id: 'keep_going',   emoji: '🔥', label: 'Keep Going' },
  { id: 'you_got_this', emoji: '💪', label: "You've Got This" },
  { id: 'goal_crusher', emoji: '🎯', label: 'Goal Crusher' },
  { id: 'support',      emoji: '❤️', label: 'Support' },
]

const BY_ID: Record<string, CheerReaction> = Object.fromEntries(
  CHEER_REACTIONS.map(r => [r.id, r]),
)

// Returns the canonical reaction for an id, or null for a plain cheer / unknown id.
export function getCheerReaction(id?: string | null): CheerReaction | null {
  if (!id) return null
  return BY_ID[id] ?? null
}
