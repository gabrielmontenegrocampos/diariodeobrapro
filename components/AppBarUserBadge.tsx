'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { User } from 'lucide-react'

export default function AppBarUserBadge() {
  const supabase = createClient()
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [initials, setInitials] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const fallbackNome = session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
      setNome(fallbackNome)
      setInitials(fallbackNome.slice(0, 2).toUpperCase())

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, foto_url')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile) {
        const n = profile.nome || fallbackNome
        setNome(n)
        setInitials(n.slice(0, 2).toUpperCase())
        if (profile.foto_url) setFotoUrl(profile.foto_url)
      }
    }
    load()
  }, [])

  if (!nome) return null

  return (
    <button
      onClick={() => router.push('/perfil')}
      className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-2.5 py-1.5 transition ml-auto shrink-0"
    >
      {/* Foto ou iniciais */}
      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/30 flex items-center justify-center shrink-0">
        {fotoUrl ? (
          <Image src={fotoUrl} alt={nome} width={28} height={28} className="object-cover w-full h-full" unoptimized />
        ) : (
          <span className="text-xs font-bold text-white leading-none">{initials}</span>
        )}
      </div>
      {/* Nome curto */}
      <span className="text-xs font-semibold text-white max-w-[80px] truncate leading-none">
        {nome.split(' ')[0]}
      </span>
    </button>
  )
}
