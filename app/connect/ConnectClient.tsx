'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Watch, Copy, Check, RefreshCw, KeyRound } from 'lucide-react'

export default function ConnectClient({ initialKey }: { initialKey: string | null }) {
  const router = useRouter()
  const [key, setKey] = useState<string | null>(initialKey)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'key' | 'url' | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])
  const endpoint = origin ? `${origin}/api/sync/health` : '/api/sync/health'

  async function generate() {
    setBusy(true)
    try {
      const res = await fetch('/api/sync/key', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.key) setKey(data.key)
    } finally {
      setBusy(false)
    }
  }

  function copy(which: 'key' | 'url', text: string) {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-16">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center justify-center w-10 h-10 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-white text-2xl font-bold">Connect a device</h1>
      </div>

      <div className="px-4 max-w-xl mx-auto space-y-4">
        <div className="flex items-center gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <Watch size={22} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <p className="text-stone-300 text-sm">
            Apple Health can&rsquo;t talk to a web app directly, so the Watch sends its data to NutriSync through an <strong className="text-white">iOS Shortcut</strong> you set up once. It then imports your <strong className="text-white">steps, active calories, and exercise minutes</strong> automatically.
          </p>
        </div>

        {/* Sync key */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={15} className="text-stone-400" aria-hidden="true" />
            <p className="text-white text-sm font-semibold">Your sync key</p>
          </div>
          {key ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 bg-stone-800 rounded-xl px-3 py-2.5 text-emerald-300 text-xs font-mono break-all">{key}</code>
                <button onClick={() => copy('key', key)} className="shrink-0 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors">
                  {copied === 'key' ? <Check size={15} /> : <Copy size={15} />}
                  {copied === 'key' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button onClick={generate} disabled={busy} className="mt-2 flex items-center gap-1.5 text-stone-400 hover:text-red-300 text-xs transition-colors disabled:opacity-50">
                <RefreshCw size={12} className={busy ? 'animate-spin' : ''} aria-hidden="true" /> Regenerate (invalidates the old key)
              </button>
            </>
          ) : (
            <button onClick={generate} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors">
              {busy ? 'Generating…' : 'Generate my sync key'}
            </button>
          )}
          <p className="text-stone-500 text-xs mt-2">Treat this like a password — anyone with it can add activity to your account.</p>
        </div>

        {/* Endpoint */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-white text-sm font-semibold mb-2">Webhook URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 bg-stone-800 rounded-xl px-3 py-2.5 text-stone-200 text-xs font-mono break-all">{endpoint}</code>
            <button onClick={() => copy('url', endpoint)} className="shrink-0 flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors">
              {copied === 'url' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'url' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <p className="text-white text-sm font-semibold mb-3">Set up the Shortcut (iPhone, ~2 min)</p>
          <ol className="list-decimal pl-5 space-y-2.5 text-stone-300 text-sm leading-relaxed marker:text-stone-500">
            <li>Open the <strong className="text-white">Shortcuts</strong> app → <strong className="text-white">Automation</strong> tab → <strong className="text-white">+</strong> → choose a trigger like <em>Time of Day → 9:00 PM, daily</em> (or <em>When a Workout ends</em>).</li>
            <li>Add action <strong className="text-white">Find Health Samples</strong> → Steps → <em>Calculate Statistics: Sum</em> → <em>Started Today</em>. Tap the result and rename the magic variable to <code className="text-emerald-300">Steps</code>.</li>
            <li>Repeat for <strong className="text-white">Active Energy</strong> (Sum, Today) → name it <code className="text-emerald-300">Calories</code>, and <strong className="text-white">Apple Exercise Time</strong> (Sum, Today) → name it <code className="text-emerald-300">Minutes</code>.</li>
            <li>Add <strong className="text-white">Get Contents of URL</strong>. Set URL to the webhook above, Method <strong className="text-white">POST</strong>.</li>
            <li>Under <strong className="text-white">Headers</strong> add <code className="text-emerald-300">Authorization</code> = <code className="text-emerald-300">Bearer YOUR_KEY</code> (paste your key).</li>
            <li>Set <strong className="text-white">Request Body</strong> to <strong className="text-white">JSON</strong> and add fields: <code className="text-emerald-300">steps</code> = Steps, <code className="text-emerald-300">activeCalories</code> = Calories, <code className="text-emerald-300">exerciseMinutes</code> = Minutes (use the named variables).</li>
            <li>Turn off &ldquo;Ask Before Running&rdquo; so it syncs silently. Done — your Watch data now flows into NutriSync.</li>
          </ol>
          <p className="text-stone-500 text-xs mt-3">Tip: run the automation once manually to confirm it works — your activity should appear on Today and in your profile history.</p>
        </div>
      </div>
    </div>
  )
}
