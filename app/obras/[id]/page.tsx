import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Plus, Image as ImageIcon, Users, AlertTriangle, Pencil, MapPin, Calendar, DollarSign, HardHat, FileText, Navigation } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RegistroCompleto } from '@/lib/types'
import ShareButton from './ShareButton'
import DeleteObraButton from './DeleteObraButton'
import AppBar from '@/components/AppBar'
import AtividadesSection from '@/components/AtividadesSection'

const climaIcon: Record<string, string> = {
  sol: '☀️', nublado: '🌤️', chuva: '🌧️', tempestade: '⛈️', ventoso: '💨',
}
const statusColor: Record<string, string> = {
  ativa: 'bg-green-100 text-green-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-gray-100 text-gray-600',
}
const statusLabel: Record<string, string> = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' }

export default async function ObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // RLS garante acesso: dono ou membro ativo da equipe
  const { data: obra } = await supabase
    .from('obras').select('*')
    .eq('id', id).single()

  if (!obra) notFound()

  const isOwner = obra.user_id === session.user.id

  const { data: registros } = await supabase
    .from('registros')
    .select('*, fotos(id, url), equipe_dia(id), ocorrencias(id)')
    .eq('obra_id', id)
    .order('data', { ascending: false })

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/share/${obra.share_token}`

  const enderecoCompleto = [obra.logradouro, obra.numero, obra.bairro, obra.cidade, obra.estado]
    .filter(Boolean).join(', ') || obra.endereco || ''
  const mapsUrl = enderecoCompleto
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoCompleto)}`
    : null

  return (
    <div className="min-h-screen">
      <AppBar subtitle={obra.nome} />
      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Topo */}
        <div className="flex items-center gap-2 mb-4">
          <Link href="/obras" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{obra.nome}</h1>
            {obra.tipo_obra && <p className="text-xs text-gray-400">{obra.tipo_obra}</p>}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusColor[obra.status]}`}>
            {statusLabel[obra.status]}
          </span>
          {isOwner && (
            <>
              <Link href={`/obras/${id}/editar`}>
                <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-300 transition">
                  <Pencil size={16} />
                </button>
              </Link>
              <DeleteObraButton obraId={id} />
            </>
          )}
        </div>

        {/* Card de dados da obra */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          {obra.foto_capa && (
            <div className="relative w-full h-44">
              <Image src={obra.foto_capa} alt={obra.nome} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}

          <div className="p-4 space-y-2.5">
            {enderecoCompleto && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{enderecoCompleto}</p>
                  {obra.cep && <p className="text-xs text-gray-400">CEP {obra.cep}</p>}
                </div>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                    <Navigation size={12} /> Rota
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 border-t border-gray-50">
              {(obra.data_inicio || obra.data_previsao_fim) && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Período</p>
                    <p className="text-xs font-medium text-gray-700">
                      {obra.data_inicio ? format(parseISO(obra.data_inicio), 'dd/MM/yy') : '—'}
                      {obra.data_previsao_fim && ` → ${format(parseISO(obra.data_previsao_fim), 'dd/MM/yy')}`}
                    </p>
                  </div>
                </div>
              )}

              {obra.valor_contrato && (
                <div className="flex items-center gap-1.5">
                  <DollarSign size={13} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Contrato</p>
                    <p className="text-xs font-medium text-gray-700">
                      {Number(obra.valor_contrato).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              )}

              {obra.responsavel_tecnico && (
                <div className="flex items-center gap-1.5">
                  <HardHat size={13} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Responsável</p>
                    <p className="text-xs font-medium text-gray-700 truncate">{obra.responsavel_tecnico}</p>
                  </div>
                </div>
              )}

              {obra.art_rrt && (
                <div className="flex items-center gap-1.5">
                  <FileText size={13} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">ART/RRT</p>
                    <p className="text-xs font-medium text-gray-700">{obra.art_rrt}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 mb-5">
          <Link href={`/obras/${id}/novo-registro`} className="flex-1">
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition text-sm">
              <Plus size={18} /> Novo Registro
            </button>
          </Link>
          <ShareButton url={shareUrl} />
          {isOwner && (
            <Link href={`/obras/${id}/relatorio`}>
              <button className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5">
                ⬇ PDF
              </button>
            </Link>
          )}
        </div>

        {/* Atividades da Obra */}
        <div className="mb-5">
          <AtividadesSection obraId={id} isOwner={isOwner} />
        </div>

        {/* Timeline de registros */}
        {(!registros || registros.length === 0) ? (
          <div className="text-center py-16 text-gray-400">
            <p>Nenhum registro ainda</p>
            <p className="text-sm mt-1">Adicione o primeiro registro do dia</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
            {registros.map((reg: RegistroCompleto & { fotos: { id: string; url: string }[]; equipe_dia: { id: string }[]; ocorrencias: { id: string }[] }) => (
              <Link key={reg.id} href={`/obras/${id}/registros/${reg.id}`} style={{ display: 'block' }}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-150">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-900 text-sm capitalize">
                      {format(parseISO(reg.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    {(reg.clima || reg.temperatura) && (
                      <span className="text-base font-medium text-gray-600">
                        {reg.clima ? climaIcon[reg.clima] : ''}{reg.temperatura ? ` ${reg.temperatura}°C` : ''}
                      </span>
                    )}
                  </div>
                  {reg.descricao && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">{reg.descricao}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400 pt-2 border-t border-gray-50">
                    {reg.fotos?.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-gray-400" />
                        {reg.fotos.length} foto{reg.fotos.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {reg.equipe_dia?.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-gray-400" />
                        {reg.equipe_dia.length} trab.
                      </span>
                    )}
                    {reg.ocorrencias?.length > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                        <AlertTriangle size={13} />
                        {reg.ocorrencias.length} ocorr.
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
