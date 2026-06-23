'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'installPromptDismissed'

/**
 * Mobile "add to home screen" nudge.
 * - Android/Chrome: captures the native beforeinstallprompt and offers a real Install button.
 * - iOS Safari: shows the manual Share → Add to Home Screen steps (no install API on iOS).
 * Hidden when already installed (standalone) or previously dismissed.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [mode, setMode] = useState<'hidden' | 'android' | 'ios'>('hidden')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setMode('ios')
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('android')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setMode('hidden')
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => {})
    dismiss()
  }

  if (mode === 'hidden') return null

  return (
    <div className="mx-4 mb-4 bg-gradient-to-br from-emerald-950/70 to-stone-900 border border-emerald-800/40 rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-900/60 flex items-center justify-center shrink-0" aria-hidden="true">
        <Download size={18} className="text-emerald-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Install NutriSync</p>
        {mode === 'android' ? (
          <p className="text-stone-400 text-xs mt-0.5">Add it to your home screen for a full-screen app + notifications.</p>
        ) : (
          <p className="text-stone-400 text-xs mt-0.5 inline-flex items-center gap-1 flex-wrap">
            Tap <Share size={12} className="text-stone-200 inline" aria-label="Share" /> then “Add to Home Screen” to install &amp; enable notifications.
          </p>
        )}
      </div>
      {mode === 'android' && (
        <button
          onClick={install}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          Install
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss install prompt" className="shrink-0 flex items-center justify-center w-11 h-11 -mr-1 text-stone-400 hover:text-white transition-colors">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
