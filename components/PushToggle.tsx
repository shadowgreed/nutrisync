'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { Bell, BellOff, Loader2 } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

type State = 'loading' | 'unsupported' | 'ios-install' | 'off' | 'enabling' | 'on' | 'denied'

// `prompt` (notifications page) only shows the enable CTA and hides entirely once
// push is on — so the notifications page is just the list. `full` (settings page)
// shows the manage controls (test / turn off).
export default function PushToggle({ mode = 'full' }: { mode?: 'prompt' | 'full' }) {
  const { t } = useI18n()
  const [state, setState] = useState<State>('loading')
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function sendTest() {
    setTestStatus('sending')
    try {
      await fetch('/api/push/test', { method: 'POST' })
      setTestStatus('sent')
      setTimeout(() => setTestStatus('idle'), 2500)
    } catch {
      setTestStatus('idle')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    // iOS only allows web push for apps added to the Home Screen (installed PWA).
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    // Mount-only capability detection must run post-hydration (server render
    // can't know the browser), so these sync setStates are deliberate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isIos && !standalone) { setState('ios-install'); return }

    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY
    if (!supported) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }

    navigator.serviceWorker.getRegistration().then(async reg => {
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setState(sub ? 'on' : 'off')
    }).catch(() => setState('off'))
  }, [])

  async function enable() {
    setState('enabling')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'off'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      setState(res.ok ? 'on' : 'off')
    } catch {
      setState('off')
    }
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
    } finally {
      setState('off')
    }
  }

  if (state === 'loading' || state === 'unsupported') return null
  // On the notifications page, once activated (or blocked) there's nothing to show.
  if (mode === 'prompt' && (state === 'on' || state === 'denied')) return null

  if (state === 'ios-install') {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-start gap-3">
        <BellOff size={18} className="text-stone-300 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{t.push.iosTitle}</p>
          <p className="text-stone-400 text-xs mt-0.5">
            {t.push.iosPre}<span className="text-stone-200">{t.push.iosShare}</span>{t.push.iosMid}<span className="text-stone-200">{t.push.iosAdd}</span>{t.push.iosPost}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 flex items-center gap-3">
      <span className="text-stone-300 shrink-0" aria-hidden="true">
        {state === 'on' ? <Bell size={18} className="text-emerald-400" /> : <BellOff size={18} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{t.push.title}</p>
        <p className="text-stone-400 text-xs">
          {state === 'on' ? t.push.onBody
            : state === 'denied' ? t.push.blockedBody
            : t.push.offBody}
        </p>
      </div>
      {state === 'on' ? (
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            onClick={sendTest}
            disabled={testStatus === 'sending'}
            className="text-emerald-300 hover:text-emerald-200 text-xs font-semibold px-3 py-2 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-60 rounded-lg transition-colors"
          >
            {testStatus === 'sent' ? t.push.sent : testStatus === 'sending' ? t.push.sending : t.push.sendTest}
          </button>
          <button onClick={disable} aria-label={t.push.turnOffAria} className="text-stone-300 hover:text-white text-xs font-semibold px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors">
            {t.push.off}
          </button>
        </div>
      ) : state === 'denied' ? null : (
        <button
          onClick={enable}
          disabled={state === 'enabling'}
          className="shrink-0 flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 rounded-lg transition-colors"
        >
          {state === 'enabling' ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
          {state === 'enabling' ? t.push.enabling : t.push.enable}
        </button>
      )}
    </div>
  )
}
