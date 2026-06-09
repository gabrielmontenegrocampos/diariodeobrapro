'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { User, Settings, Users, LogOut, X } from 'lucide-react'

// Cache por 10 min no sessionStorage — evita 2 queries a cada navegação
const CACHE_KEY = 'diario_appbar_v1'
const CACHE_TTL = 10 * 60 * 1000

export default function AppBarUserBadge() {
  const supabase = createClient()
  const router   = useRouter()

  const [session,  setSession]  = useState<any>(null)
  const [nome,     setNome]     = useState('')
  const [fotoUrl,  setFotoUrl]  = useState<string | null>(null)
  const [initials, setInitials] = useState('')
  const [isOwner,  setIsOwner]  = useState(true)
  const [open,     setOpen]     = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setSession(session)

      const fallback = session.user.user_metadata?.name || session.user.email?.split('@')[0] || ''
      setNome(fallback)
      setInitials(fallback.slice(0, 2).toUpperCase())

      // ── Tenta usar cache antes de ir ao banco ────────────────────
      try {
        const raw = sessionStorage.getItem(`${CACHE_KEY}_${session.user.id}`)
        if (raw) {
          const { data: c, ts } = JSON.parse(raw)
          if (Date.now() - ts < CACHE_TTL) {
            setNome(c.nome)
            setInitials(c.initials)
            setFotoUrl(c.fotoUrl)
            setIsOwner(c.isOwner)
            return // ← sem query ao banco
          }
        }
      } catch {}

      // ── Cache miss: busca profile + check de membro em paralelo ──
      const [{ data: profile }, { data: memberCheck }] = await Promise.all([
        supabase.from('profiles').select('nome, foto_url').eq('id', session.user.id).maybeSingle(),
        supabase.from('team_members').select('id').eq('member_id', session.user.id).eq('status', 'active').limit(1),
      ])

      const n     = profile?.nome || fallback
      const foto  = profile?.foto_url || null
      const ini   = n.slice(0, 2).toUpperCase()
      const owner = !(memberCheck && memberCheck.length > 0)

      setNome(n)
      setInitials(ini)
      setFotoUrl(foto)
      setIsOwner(owner)

      // ── Persiste no cache ─────────────────────────────────────────
      try {
        sessionStorage.setItem(`${CACHE_KEY}_${session.user.id}`, JSON.stringify({
          data: { nome: n, initials: ini, fotoUrl: foto, isOwner: owner },
          ts: Date.now(),
        }))
      } catch {}
    }
    load()
  }, [])

  async function signOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  if (!session) return null

  const Avatar = ({ size = 28 }: { size?: number }) => (
    <div style={{ width: size, height: size }}
      className="rounded-full overflow-hidden bg-white/30 flex items-center justify-center shrink-0">
      {fotoUrl ? (
        <Image src={fotoUrl} alt={nome} width={size} height={size} className="object-cover w-full h-full" unoptimized />
      ) : (
        <span className="text-xs font-bold text-white leading-none">{initials}</span>
      )}
    </div>
  )

  return (
    <>
      {/* Badge button in AppBar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-2.5 py-1.5 transition ml-auto shrink-0"
      >
        <Avatar size={28} />
        <span className="text-xs font-semibold text-white max-w-[80px] truncate leading-none">
          {nome.split(' ')[0]}
        </span>
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
          onClick={() => setOpen(false)} />
      )}

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* User info header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1e3a5f] flex items-center justify-center shrink-0">
            {fotoUrl ? (
              <Image src={fotoUrl} alt={nome} width={48} height={48} className="object-cover w-full h-full" unoptimized />
            ) : (
              <span className="text-sm font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{nome}</p>
            <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Menu items */}
        <div className="py-2 px-2">
          <button onClick={() => go('/perfil')}
            className="w-full flex items-center gap-3 px-3 py-3.5 text-sm text-gray-700 hover:bg-[#eef4fc] rounded-xl transition font-medium">
            <User size={18} className="text-[#2a5298] shrink-0" />
            Meu Perfil
          </button>

          {isOwner && (
            <>
              <button onClick={() => go('/equipe')}
                className="w-full flex items-center gap-3 px-3 py-3.5 text-sm text-gray-700 hover:bg-[#eef4fc] rounded-xl transition font-medium">
                <Users size={18} className="text-[#2a5298] shrink-0" />
                Equipe
              </button>
              <button onClick={() => go('/empresa')}
                className="w-full flex items-center gap-3 px-3 py-3.5 text-sm text-gray-700 hover:bg-[#eef4fc] rounded-xl transition font-medium">
                <Settings size={18} className="text-[#2a5298] shrink-0" />
                Empresa
              </button>
            </>
          )}

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-3.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition font-medium">
              <LogOut size={18} className="shrink-0" />
              Sair
            </button>
          </div>
        </div>

        {/* Safe area padding */}
        <div className="pb-6" />
      </div>
    </>
  )
}
