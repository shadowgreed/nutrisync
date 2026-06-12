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
      <svg width="120" height="132" viewBox="0 0 120 132" fill="none" className="splash-leaf">
        <defs>
          {/* Gradient axis runs bottom-left -> top-right; a hard edge sweeps along
              it so the leaf fills diagonally. */}
          <linearGradient id="ns-leaf-fill" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#34d399">
              <animate attributeName="offset" values="0;1.08" dur="1.15s" begin="0.2s" fill="freeze"
                calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
            </stop>
            <stop offset="0" stopColor="#34d399" stopOpacity="0">
              <animate attributeName="offset" values="0;1.08" dur="1.15s" begin="0.2s" fill="freeze"
                calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
            </stop>
          </linearGradient>
        </defs>

        {/* Stem */}
        <path d="M60 116 L60 130" stroke="#1f4d3a" strokeWidth="3.5" strokeLinecap="round" />
        {/* Empty leaf outline (shows the shape over the dark background) */}
        <path d="M60 8 C 96 32, 100 80, 60 120 C 20 80, 24 32, 60 8 Z" fill="none" stroke="#1f4d3a" strokeWidth="2.5" />
        {/* The fill that sweeps in */}
        <path d="M60 8 C 96 32, 100 80, 60 120 C 20 80, 24 32, 60 8 Z" fill="url(#ns-leaf-fill)" />
        {/* Midrib + veins for detail */}
        <g stroke="#065f46" strokeWidth="2" strokeLinecap="round" opacity="0.55">
          <path d="M60 24 L60 110" />
          <path d="M60 52 L82 42" />
          <path d="M60 52 L38 42" />
          <path d="M60 78 L86 68" />
          <path d="M60 78 L34 68" />
        </g>
      </svg>

      <p className="splash-word text-white text-2xl font-bold tracking-tight">
        Nutri<span className="text-emerald-400">Sync</span>
      </p>
    </div>
  )
}
