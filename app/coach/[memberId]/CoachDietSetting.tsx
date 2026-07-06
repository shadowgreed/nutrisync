'use client'

import { useState } from 'react'
import { Salad, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DIETS } from '@/lib/diets'
import { useI18n } from '@/components/I18nProvider'
import type { Diet } from '@/types'

// Coach view of a client's diet. The member's own choice shows by default; the
// coach can override it per client (stored in coach_client_settings). "Use
// member's choice" clears the override.
export default function CoachDietSetting({
  groupId, coachId, memberId, memberDiet, initialOverride,
}: {
  groupId: string; coachId: string; memberId: string
  memberDiet: Diet | null; initialOverride: Diet | null
}) {
  const { t } = useI18n()
  const c = t.coach
  const dietText = (d: Diet | null) => d ? t.diets[d] : t.editProfile.noDiet
  const [override, setOverride] = useState<Diet | null>(initialOverride)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const effective = override ?? memberDiet

  async function change(next: Diet | null) {
    setOverride(next); setSaving(true); setSaved(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('coach_client_settings')
      .upsert(
        { group_id: groupId, coach_id: coachId, member_id: memberId, diet_override: next, updated_at: new Date().toISOString() },
        { onConflict: 'coach_id,member_id' },
      )
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <section className="px-4 mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <Salad size={13} className="text-emerald-400" />
        <p className="text-stone-400 text-xs uppercase tracking-wider">{c.diet}</p>
        {saving && <Loader2 size={12} className="text-stone-500 animate-spin" />}
        {saved && <Check size={12} className="text-emerald-400" />}
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
        <p className="text-stone-300 text-sm mb-2">
          {c.copilotAdjusts(dietText(effective))}
        </p>
        <select
          value={override ?? ''}
          onChange={e => change(e.target.value ? (e.target.value as Diet) : null)}
          className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">{c.useMembersChoice(memberDiet ? ` (${dietText(memberDiet)})` : '')}</option>
          {DIETS.map(d => <option key={d} value={d}>{dietText(d)}</option>)}
        </select>
        {override && <p className="text-stone-500 text-[11px] mt-1.5">{c.overridingNote}</p>}
      </div>
    </section>
  )
}
