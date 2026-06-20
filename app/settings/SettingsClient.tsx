'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChevronRight, User, Mail, KeyRound, Link2, Ruler, Palette, Languages,
  Bell, Shield, Download, Trash2, Activity, Watch, CreditCard, Receipt, Crown,
  HelpCircle, MessageCircle, FileText, Info, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const APP_VERSION = '0.1.0'

interface RowProps {
  icon: React.ReactNode
  label: string
  value?: string
  href?: string
  soon?: boolean
  danger?: boolean
  onClick?: () => void
}

function Row({ icon, label, value, href, soon, danger, onClick }: RowProps) {
  const inner = (
    <>
      <span className={`shrink-0 ${danger ? 'text-red-400' : 'text-stone-400'}`}>{icon}</span>
      <span className={`flex-1 text-sm ${danger ? 'text-red-300' : 'text-stone-200'}`}>{label}</span>
      {value && <span className="text-stone-500 text-xs">{value}</span>}
      {soon
        ? <span className="text-[10px] font-semibold text-stone-500 bg-stone-800 border border-stone-700 px-1.5 py-0.5 rounded-full">Soon</span>
        : (href || onClick) && <ChevronRight size={16} className="text-stone-600 shrink-0" />}
    </>
  )
  const cls = `w-full flex items-center gap-3 px-4 py-3 text-left ${soon ? 'opacity-60' : 'hover:bg-stone-800/50'} transition-colors`
  if (href && !soon) return <Link href={href} className={cls}>{inner}</Link>
  return (
    <button type="button" onClick={soon ? undefined : onClick} disabled={soon || (!onClick && !href)} className={cls}>
      {inner}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 mb-5">
      <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">{title}</p>
      <div className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 overflow-hidden">
        {children}
      </div>
    </section>
  )
}

export default function SettingsClient({ email, plan }: { email: string; plan: string }) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function deleteAccount() {
    setDeleting(true); setError('')
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not delete account')
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href="/profile" aria-label="Back to profile" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <Section title="Account">
        <Row icon={<User size={16} />} label="Profile details" href="/profile/edit" />
        <Row icon={<Mail size={16} />} label="Email" value={email} />
        <Row icon={<KeyRound size={16} />} label="Password" soon />
        <Row icon={<Link2 size={16} />} label="Connected accounts" soon />
      </Section>

      <Section title="Preferences">
        <Row icon={<Ruler size={16} />} label="Units" value="Metric / Imperial" soon />
        <Row icon={<Palette size={16} />} label="Theme" value="Dark" soon />
        <Row icon={<Languages size={16} />} label="Language" value="English" soon />
      </Section>

      <Section title="Notifications">
        <Row icon={<Bell size={16} />} label="Notifications & reminders" href="/profile/edit" />
      </Section>

      <Section title="Privacy">
        <Row icon={<Shield size={16} />} label="Profile & feed visibility" href="/profile/edit" />
        <Row icon={<Download size={16} />} label="Export my data" soon />
        <Row icon={<Trash2 size={16} />} label="Delete account" danger onClick={() => setConfirmDelete(true)} />
      </Section>

      <Section title="Integrations">
        <Row icon={<Activity size={16} />} label="Apple Health" soon />
        <Row icon={<Activity size={16} />} label="Google Health Connect" soon />
        <Row icon={<Watch size={16} />} label="Wearables" soon />
      </Section>

      <Section title="Subscription">
        <Row icon={<CreditCard size={16} />} label="Current plan" value={`${plan} plan`} />
        <Row icon={<Receipt size={16} />} label="Billing history" soon />
        <Row icon={<Crown size={16} />} label="Upgrade to Coach plan" soon />
      </Section>

      <Section title="Support">
        <Row icon={<HelpCircle size={16} />} label="Help center" soon />
        <Row icon={<MessageCircle size={16} />} label="Contact support" soon />
        <Row icon={<FileText size={16} />} label="Terms of service" href="/terms" />
        <Row icon={<Shield size={16} />} label="Privacy policy" href="/privacy" />
        <Row icon={<Info size={16} />} label="App version" value={`v${APP_VERSION}`} />
      </Section>

      {/* Log out */}
      <div className="px-4">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="w-full max-w-sm bg-stone-900 border border-red-900/50 rounded-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 size={18} className="text-red-400" />
              <h2 className="text-white font-bold">Delete account?</h2>
            </div>
            <p className="text-stone-300 text-sm mb-4">This permanently removes your account, logs, and group memberships. This can&apos;t be undone.</p>
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-900/70 hover:bg-red-900 text-red-100 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
