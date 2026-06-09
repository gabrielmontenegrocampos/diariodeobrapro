'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Plus, MapPin, Calendar, LogOut, HardHat, Settings, Navigation, Users } from 'lucide-react'
import AppBar from '@/components/AppBar'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusLabel: Record<string, string> = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' }
const statusColor: Record<string, string> = {
  ativa: 'bg-green-100 text-green-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-gray-100 text-gray-600',
}

export default function ObrasPage() {
  const router = useRouter()
  const supabase = createClient()
  const [obras, setObras] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setUserId(session.user.id)

      // Nome do usuário
      const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário'
      setUserName(name)

      // Verifica se é membro (não dono)
      const { data: memberCheck } = await supabase
        .from('team_members')
        .select('id')
        .eq('member_id', session.user.id)
        .eq('status', 'active')
        .limit(1)
      setIsMember(!!(memberCheck && memberCheck.length > 0))

      // Busca obras (RLS cuida da visibilidade)
      const { data } = await supabase
        .from('obras').select('*')
        .order('created_at', { ascending: false })
      setObras(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <LoadingOverlay message="Carregando obras..." />

  return (
    <div className="min-h-screen pb-28">
      <AppBar />
      <div className="max-w-lg mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isMember ? 'Obras' : 'Minhas Obras'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Olá, <span className="font-medium text-gray-600">{userName}</span></p>
        </div>
        <div className="flex items-center gap-1">
          {!isMember && (
            <>
              <Link href="/equipe">
                <button className="p-2 text-gray-400 hover:text-orange-500 transition" title="Equipe">
                  <Users size={20} />
                </button>
              </Link>
              <Link href="/empresa">
                <button className="p-2 text-gray-400 hover:text-orange-500 transition" title="Empresa">
                  <Settings size={20} />
                </button>
              </Link>
            </>
          )}
          <button onClick={signOut} className="p-2 text-gray-400 hover:text-gray-600" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {obras.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Nenhuma obra ainda</p>
          <p className="text-sm">Crie sua primeira obra abaixo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra) => {
            const enderecoCompleto = [obra.logradouro, obra.numero, obra.bairro, obra.cidade, obra.estado]
              .filter(Boolean).join(', ')
            const enderecoExibir = enderecoCompleto || obra.endereco || ''
            const mapsUrl = enderecoExibir
              ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoExibir)}`
              : null

            return (
              <div
                key={obra.id}
                onClick={() => router.push(`/obras/${obra.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer"
              >
                <div className="flex">
                  {/* Foto quadrada */}
                  <div className="relative w-24 h-24 shrink-0">
                    {obra.foto_capa ? (
                      <Image src={obra.foto_capa} alt={obra.nome} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                        <HardHat size={28} className="text-orange-300" />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <h2 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{obra.nome}</h2>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[obra.status]}`}>
                          {statusLabel[obra.status]}
                        </span>
                        {obra.user_id !== userId && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                            <Users size={9} /> Equipe
                          </span>
                        )}
                      </div>
                    </div>

                    {obra.tipo_obra && (
                      <p className="text-xs text-gray-400 mb-1">{obra.tipo_obra}</p>
                    )}

                    {enderecoExibir && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500 line-clamp-1 flex-1">{enderecoExibir}</span>
                        {mapsUrl && (
                          <button
                            onClick={e => { e.stopPropagation(); window.open(mapsUrl, '_blank') }}
                            className="shrink-0 p-1 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Abrir no Google Maps"
                          >
                            <Navigation size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    {obra.data_inicio && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar size={11} />
                        {format(parseISO(obra.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                        {obra.data_previsao_fim && (
                          <span>→ {format(parseISO(obra.data_previsao_fim), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isMember && (
        <Link href="/obras/nova">
          <button className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition">
            <Plus size={22} />
            <span className="font-semibold pr-1">Nova Obra</span>
          </button>
        </Link>
      )}
      </div>
    </div>
  )
}
