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

/** Send to an explicit list of subscriptions (used by the server-side cron, which
 *  reads subscriptions with the admin client rather than the auth-scoped RPC). */
export async function sendPushToSubscriptions(
  subscriptions: webpush.PushSubscription[],
  payload: PushPayload,
): Promise<number> {
  ensureConfigured()
  if (!configured) return 0
  const body = JSON.stringify(payload)
  let ok = 0
  await Promise.all(
    subscriptions.map(async (sub) => {
      try { await webpush.sendNotification(sub, body); ok++ } catch { /* expired/invalid — ignore */ }
    }),
  )
  return ok
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
