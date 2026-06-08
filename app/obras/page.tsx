'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Plus, MapPin, Calendar, LogOut, HardHat, Building2, ExternalLink } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data } = await supabase
        .from('obras')
        .select('*')
        .eq('user_id', session.user.id)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Obras</h1>
        <div className="flex items-center gap-1">
          <Link href="/empresa">
            <button className="p-2 text-gray-400 hover:text-orange-500 transition" title="Dados da empresa">
              <Building2 size={20} />
            </button>
          </Link>
          <button onClick={signOut} className="p-2 text-gray-400 hover:text-gray-600">
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
              <div key={obra.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
                <div className="flex">
                  <Link href={`/obras/${obra.id}`} className="shrink-0">
                    <div className="relative w-24 h-24">
                      {obra.foto_capa ? (
                        <Image src={obra.foto_capa} alt={obra.nome} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                          <HardHat size={28} className="text-orange-300" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 p-3">
                    <Link href={`/obras/${obra.id}`} className="block">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <h2 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{obra.nome}</h2>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusColor[obra.status]}`}>
                          {statusLabel[obra.status]}
                        </span>
                      </div>
                      {obra.tipo_obra && (
                        <p className="text-xs text-gray-400 mb-1">{obra.tipo_obra}</p>
                      )}
                    </Link>

                    {enderecoExibir && mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 hover:underline mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <MapPin size={11} className="shrink-0" />
                        <span className="line-clamp-1">{enderecoExibir}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
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

      <Link href="/obras/nova">
        <button className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition">
          <Plus size={22} />
          <span className="font-semibold pr-1">Nova Obra</span>
        </button>
      </Link>
    </div>
  )
}
