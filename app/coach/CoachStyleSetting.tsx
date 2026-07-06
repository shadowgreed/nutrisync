'use client'

import { useState } from 'react'
import { Check, Loader2, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/I18nProvider'

// Lets a coach set the voice/tone the Copilot uses when drafting check-ins.
// Saved straight to profiles.coach_style (RLS allows updating your own profile).
export default function CoachStyleSetting({ userId, initial }: { userId: string; initial: string | null }) {
  const { t } = useI18n()
  const c = t.coach
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initial ?? '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true); setSaved(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ coach_style: value.trim() || null })
      .eq('id', userId)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="px-4 mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-stone-300 text-sm bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 hover:border-stone-700 transition-colors"
      >
        <MessageSquare size={15} className="text-stone-400" />
        <span className="flex-1 text-left">{c.coachingVoice} {value ? `· ${c.voiceSet}` : `· ${c.voiceDefault}`}</span>
        <span className="text-stone-500 text-xs">{open ? c.hide : c.edit}</span>
      </button>

      {open && (
        <div className="mt-2 bg-stone-900 border border-stone-800 rounded-2xl p-3">
          <p className="text-stone-400 text-xs mb-2">
            {c.voicePrompt}
          </p>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value.slice(0, 280))}
            rows={2}
            placeholder={c.describeYourTone}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saving ? c.saving : saved ? c.saved : c.save}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
