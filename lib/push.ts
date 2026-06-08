import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

let configured = false
function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@nutrisync.app'
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Send a web-push to every device the recipient has registered. Reads the
 * recipient's subscriptions via the group-gated SECURITY DEFINER function so the
 * caller doesn't need RLS access to another user's rows. Best-effort: failures
 * (e.g. expired subscriptions) are swallowed so they never break the action.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  ensureConfigured()
  if (!configured) return

  const { data, error } = await supabase.rpc('get_push_subscriptions', { target: userId })
  if (error || !Array.isArray(data) || data.length === 0) return

  const body = JSON.stringify(payload)
  await Promise.all(
    (data as webpush.PushSubscription[]).map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body)
      } catch {
        // Expired/invalid subscription — ignore (cleanup happens on next subscribe).
      }
    }),
  )
}
