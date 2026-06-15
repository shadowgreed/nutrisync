import Anthropic from '@anthropic-ai/sdk'
import type { ClientSignal } from './copilot'
import type { WeeklyReport } from './weekly'

// ── Coach Copilot: the only AI in the feature ─────────────────────────────────
// draftCheckin() turns ALREADY-COMPUTED facts (from lib/copilot.ts) into a short,
// human-sounding check-in the coach reviews and sends in their own voice. It never
// computes nutrition, never writes to the DB, and never reaches the member on its
// own — its output lands in a review queue (coach_message_drafts).

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type DraftKind = 'nudge' | 'praise' | 'weekly_checkin'

/** Pick the kind of message that best fits the member's current signals. */
export function chooseKind(signals: ClientSignal[]): DraftKind {
  if (signals.some(s => s.code === 'strong_week')) return 'praise'
  if (signals.some(s => s.severity === 'warn')) return 'nudge'
  return 'weekly_checkin'
}

export interface DraftRequest {
  coachName: string
  coachStyle?: string | null
  memberFirstName: string
  kind: DraftKind
  signals: ClientSignal[]
  report: WeeklyReport
}

// A deterministic message so the queue is never empty/broken if the API is down.
function templateDraft(req: DraftRequest): string {
  const name = req.memberFirstName
  switch (req.kind) {
    case 'praise':
      return `${name}, awesome week — you hit your calorie and nutrient targets. Really proud of the consistency. Keep it rolling! 🎉`
    case 'nudge': {
      const gap = req.signals.find(s => s.code === 'logging_gap')
      if (gap) return `Hey ${name}, noticed it's been a little while since your last log — everything okay? Even a quick photo of your next meal keeps the momentum going. 💪`
      return `Hey ${name}, your calories drifted a bit off target this week. Nothing dramatic — let's tighten it up together. What's been tricky?`
    }
    default:
      return `Hey ${name}, checking in on your week — ${req.report.daysLogged} day${req.report.daysLogged === 1 ? '' : 's'} logged. How are you feeling about your progress? Anything I can help with?`
  }
}

const SYSTEM = `You are a drafting assistant for a fitness & nutrition coach. You write ONE short check-in message the coach will review and send to a client in their own voice.

Rules:
- Only reference facts present in the data you are given. NEVER invent numbers, foods, workouts, or feelings.
- Warm, specific, and encouraging. Celebrate effort and consistency, never shame. No guilt, no "you failed" framing.
- No medical, diagnostic, or weight-loss-guarantee claims.
- Use the client's first name only. Keep it under 60 words.
- If the coach provided a style/voice, match it.
- Output ONLY the message text — no preamble, no quotation marks, no signature.`

export async function draftCheckin(req: DraftRequest): Promise<{ text: string }> {
  const facts = {
    kind: req.kind,
    coachName: req.coachName,
    coachStyle: req.coachStyle ?? undefined,
    clientFirstName: req.memberFirstName,
    daysLoggedThisWeek: req.report.daysLogged,
    calories: req.report.daysLogged
      ? { avgPerDay: req.report.calories.avgPerDay, target: req.report.calories.target, status: req.report.calories.status }
      : null,
    nutrients: req.report.daysLogged
      ? { onTrack: req.report.nutrients.onTrack, total: req.report.nutrients.total,
          best: req.report.nutrients.best?.label ?? null, worst: req.report.nutrients.worst?.label ?? null }
      : null,
    activeDays: req.report.activities.activeDays,
    flags: req.signals.map(s => s.label),
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Draft the ${req.kind} message from this client data:\n${JSON.stringify(facts)}` }],
    })
    const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    // Strip wrapping quotes the model sometimes adds despite instructions.
    const text = raw.replace(/^["“']|["”']$/g, '').trim()
    if (text) return { text }
  } catch {
    /* fall through to template */
  }
  return { text: templateDraft(req) }
}
