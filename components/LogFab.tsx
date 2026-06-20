'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Plus, X, Utensils, Dumbbell, Droplet, Scale } from 'lucide-react'

// Global quick-log button (PRD FR-006). Floats above the bottom nav on the four
// main tabs and expands to the logging entry points, keeping logging within two
// taps from anywhere. Routes to the existing loggers rather than duplicating them.
const ACTIONS = [
  { label: 'Log meal', href: '/log', icon: Utensils, color: 'bg-emerald-600' },
  { label: 'Log activity', href: '/log?tab=activity', icon: Dumbbell, color: 'bg-orange-600' },
  { label: 'Log water', href: '/dashboard', icon: Droplet, color: 'bg-sky-600' },
  { label: 'Log weight', href: '/trends', icon: Scale, color: 'bg-violet-600' },
]

export default function LogFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Tap-out backdrop */}
      {open && (
        <button
          aria-label="Close quick log"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        />
      )}

      <div className="fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-2.5">
        {open && ACTIONS.map(a => {
          const Icon = a.icon
          return (
            <Link
              key={a.label}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-150"
            >
              <span className="bg-stone-900 border border-stone-700 text-stone-100 text-sm font-medium px-3 py-1.5 rounded-xl shadow-lg">
                {a.label}
              </span>
              <span className={`w-11 h-11 rounded-full ${a.color} flex items-center justify-center text-white shadow-lg`}>
                <Icon size={18} />
              </span>
            </Link>
          )
        })}

        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close quick log' : 'Quick log'}
          aria-expanded={open}
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-900/40 transition-transform active:scale-95"
        >
          <span className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
            {open ? <X size={26} /> : <Plus size={26} />}
          </span>
        </button>
      </div>
    </>
  )
}
