// Tone options for Copilot drafts. Kept in their own module (no Anthropic SDK
// import) so the client view can render the tone chips without pulling the
// server-only drafting code into the browser bundle.

// 'auto' (the default) leans only on the coach's saved voice; the others nudge
// the wording without ever changing the underlying facts.
export type DraftTone = 'auto' | 'encouraging' | 'direct' | 'casual' | 'tough_love'

export const DRAFT_TONES: { value: DraftTone; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'encouraging', label: 'Encouraging' },
  { value: 'direct', label: 'Direct' },
  { value: 'casual', label: 'Casual' },
  { value: 'tough_love', label: 'Tough love' },
]

export const TONE_GUIDANCE: Record<DraftTone, string | null> = {
  auto: null,
  encouraging: 'Tone: extra warm and encouraging — lead with praise and reassurance.',
  direct: 'Tone: direct and concise — get to the point in a sentence or two, friendly but no fluff.',
  casual: 'Tone: casual and conversational, like a quick text to a friend. Light, relaxed wording.',
  tough_love: 'Tone: tough love — supportive but firmly accountable. Name the gap honestly and ask for a concrete next step. Never shame or use guilt.',
}

export function isDraftTone(v: unknown): v is DraftTone {
  return typeof v === 'string' && v in TONE_GUIDANCE
}
