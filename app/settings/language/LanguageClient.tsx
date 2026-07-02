'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import type { Locale } from '@/lib/i18n'
import { SettingsShell } from '../_ui'

export default function LanguageClient({ saved }: { saved: Locale | null }) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState<'account' | 'device' | null>(null)
  // The profile value wins for display; fall back to the device cookie.
  const current = saved ?? locale

  async function choose(next: Locale) {
    if (next === current || saving) return
    setSaving(true)
    try {
      // One server call sets the device cookie (Set-Cookie survives Safari's
      // 7-day cap on JS cookies) and writes profiles.language when possible.
      // `account` is false when the profile column is missing (migration 051
      // not applied) — surface that instead of claiming a full save.
      const res = await fetch('/api/language', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      })
      const data = res.ok ? await res.json() as { account?: boolean } : {}
      setSavedFlash(data.account ? 'account' : 'device')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const OPTIONS: { value: Locale; label: string; sub: string }[] = [
    { value: 'en', label: t.settings.english, sub: 'English' },
    { value: 'es', label: t.settings.spanish, sub: 'Latin American Spanish' },
  ]

  return (
    <SettingsShell title={t.settings.languageTitle} back="/settings">
      <p className="px-4 text-stone-400 text-sm">{t.settings.languageIntro}</p>

      <div className="px-4 mt-4 space-y-2">
        {OPTIONS.map(o => {
          const selected = current === o.value
          return (
            <button
              key={o.value}
              onClick={() => choose(o.value)}
              disabled={saving}
              aria-pressed={selected}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all disabled:opacity-60 ${
                selected ? 'border-emerald-500 bg-emerald-900/30' : 'border-stone-700 bg-stone-900 hover:border-stone-500'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${selected ? 'text-white' : 'text-stone-300'}`}>{o.label}</p>
                <p className="text-stone-400 text-xs mt-0.5">{o.sub}</p>
              </div>
              {selected && <Check size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      {savedFlash === 'account' && (
        <p className="px-4 mt-3 text-emerald-300 text-sm" role="status">{t.settings.languageSaved}</p>
      )}
      {savedFlash === 'device' && (
        <p className="px-4 mt-3 text-amber-300 text-sm" role="status">{t.settings.languageSavedDevice}</p>
      )}
      <p className="px-4 mt-3 text-stone-400 text-xs">{t.settings.languageNote}</p>
    </SettingsShell>
  )
}
