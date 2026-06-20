// ── Adaptive coaching voice (deterministic) ──────────────────────────────────
// Infers a coach's voice profile from the check-ins they've actually sent — no
// LLM. The Copilot uses this only as a hint; the coach can always override the
// tone manually. Confidence grows with sample size.

export interface VoiceProfile {
  profile: string        // headline, e.g. "Supportive" | "Direct" | "Balanced"
  traits: string[]       // up to two secondary traits
  confidence: number     // 0–100, from sample size + signal strength
  sampleSize: number     // number of sent messages analysed
}

const WARM = /\b(great|awesome|proud|love|amazing|nice|keep|fantastic|well done|wonderful|incredible|crushing|smashed|rocking)\b/gi
// Rough emoji match (covers the common ranges used in messages).
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu

function count(re: RegExp, s: string): number {
  const m = s.match(re)
  return m ? m.length : 0
}

export function inferVoice(messages: string[]): VoiceProfile {
  const msgs = messages.map(m => (m ?? '').trim()).filter(Boolean)
  const n = msgs.length
  if (n === 0) return { profile: 'Learning your voice', traits: [], confidence: 0, sampleSize: 0 }

  const text = msgs.join('\n')
  const wordsPerMsg = msgs.map(m => m.split(/\s+/).filter(Boolean).length)
  const avgLen = wordsPerMsg.reduce((s, v) => s + v, 0) / n
  const exclamPer = count(/!/g, text) / n
  const questionPer = count(/\?/g, text) / n
  const emojiPer = count(EMOJI, text) / n
  const warmPer = count(WARM, text) / n

  // Primary axis: warmth vs directness.
  const warmth = exclamPer + emojiPer * 1.5 + warmPer
  const profile = warmth >= 0.9 ? 'Supportive' : avgLen <= 26 ? 'Direct' : 'Balanced'

  // Secondary traits.
  const traits: string[] = []
  if (emojiPer >= 0.6 || exclamPer >= 1) traits.push('Encouraging')
  if (questionPer >= 0.8) traits.push('Curious')
  if (avgLen <= 22) traits.push('Concise')
  else if (avgLen >= 45) traits.push('Detailed')

  // Confidence: mostly sample size, nudged by how consistent the signal is.
  const confidence = Math.max(20, Math.min(95, Math.round(40 + n * 3.5)))

  return { profile, traits: traits.slice(0, 2), confidence, sampleSize: n }
}
