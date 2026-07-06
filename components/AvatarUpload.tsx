'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/I18nProvider'

// Tappable avatar that uploads a new profile picture. Uses a UNIQUE filename each
// time (not a fixed name + upsert) so it never trips the storage UPDATE policy or
// serves a stale cached image — a common reason "I can't change my photo" reports.
export default function AvatarUpload({
  initialUrl, name, size = 'lg',
}: { initialUrl: string | null; name: string; size?: 'lg' | 'md' }) {
  const router = useRouter()
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  const dim = size === 'lg' ? 'w-24 h-24 rounded-3xl text-3xl' : 'w-16 h-16 rounded-2xl text-2xl'

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t.groups.notSignedIn)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
      if (upErr) throw new Error(upErr.message)
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      if (updErr) throw new Error(updErr.message)
      setUrl(publicUrl)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.profile.uploadFailedGeneric)
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div className="relative inline-block">
      <input ref={ref} type="file" accept="image/*" onChange={handle} className="hidden" />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        aria-label={t.profile.changePhotoAria}
        className="relative block"
      >
        <div className={`${dim} bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center font-bold text-white overflow-hidden`}>
          {url
            ? <img src={url} alt={t.profile.yourProfileAlt} className="w-full h-full object-cover" />
            : (name?.[0]?.toUpperCase() ?? '?')}
        </div>
        <div className="absolute -bottom-1 -right-1 bg-stone-800 border border-stone-600 rounded-full p-1.5 text-stone-100">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </div>
      </button>
      {err && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-red-400 text-[10px]">{err}</span>
      )}
    </div>
  )
}
