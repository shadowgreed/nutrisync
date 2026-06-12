'use client'

import { useEffect, useState } from 'react'

// Branded launch screen: the NutriSync leaf fills with emerald from bottom-left
// to top-right over the app's background, then the whole thing fades into the
// page. SSR-rendered (so it covers the first paint — no flash of content), and it
// unmounts itself after one play, so it only shows on a real app open, not on
// in-app navigation.
export default function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fading' | 'done'>('show')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 1500)
    const t2 = setTimeout(() => setPhase('done'), 2050)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] bg-stone-950 flex flex-col items-center justify-center gap-5 transition-opacity duration-500 ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Exact logo leaf (Lucide "leaf") — empty outline that fills emerald
          diagonally from bottom-left to top-right. */}
      <svg width="128" height="128" viewBox="0 0 24 24" fill="none" className="splash-leaf">
        <defs>
          <linearGradient id="ns-leaf-fill" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#10b981">
              <animate attributeName="offset" values="0;1.05" dur="1.2s" begin="0.2s" fill="freeze"
                calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
            </stop>
            <stop offset="0" stopColor="#10b981" stopOpacity="0">
              <animate attributeName="offset" values="0;1.05" dur="1.2s" begin="0.2s" fill="freeze"
                calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
            </stop>
          </linearGradient>
        </defs>

        {/* Emerald fill sweeping into the leaf body */}
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="url(#ns-leaf-fill)" />
        {/* The logo, exactly: white outline + stem/vein on top */}
        <g fill="none" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </g>
      </svg>

      <p className="splash-word text-white text-2xl font-bold tracking-tight">
        Nutri<span className="text-emerald-400">Sync</span>
      </p>
    </div>
  )
}
