'use client'

import { useEffect, useState } from 'react'
import { Droplets, Utensils } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-emerald-600' : 'bg-stone-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function ReminderSettings() {
  const [water, setWater] = useState(true)
  const [meal, setMeal] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // select('*') so missing reminder columns (pre-migration-013) don't error
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setWater(data.water_reminders_enabled ?? true)
        setMeal(data.meal_reminders_enabled ?? true)
        if (!data.reminder_timezone) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          if (tz) await supabase.from('profiles').update({ reminder_timezone: tz }).eq('id', user.id)
        }
      }
      setLoaded(true)
    })()
  }, [])

  async function toggle(kind: 'water' | 'meal', value: boolean) {
    if (kind === 'water') setWater(value); else setMeal(value)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const patch = kind === 'water'
      ? { water_reminders_enabled: value, reminder_timezone: tz }
      : { meal_reminders_enabled: value, reminder_timezone: tz }
    await supabase.from('profiles').update(patch).eq('id', user.id)
  }

  if (!loaded) return null

  return (
    <div className="mx-4 mb-4">
      <p className="text-stone-400 text-xs uppercase tracking-wider mb-2 px-1">Reminders</p>
      <div className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <Droplets size={18} className="text-sky-400 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Water reminders</p>
            <p className="text-stone-400 text-xs">Every 2 hours during the day</p>
          </div>
          <Switch on={water} onChange={v => toggle('water', v)} label="Water reminders" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Utensils size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Meal reminders</p>
            <p className="text-stone-400 text-xs">Breakfast, lunch &amp; dinner</p>
          </div>
          <Switch on={meal} onChange={v => toggle('meal', v)} label="Meal reminders" />
        </div>
      </div>
      <p className="text-stone-400 text-[11px] mt-2 px-1">Reminders are delivered via push — enable notifications above to receive them.</p>
    </div>
  )
}
