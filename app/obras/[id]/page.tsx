import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Plus, Image as ImageIcon, Users, AlertTriangle, Pencil } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { RegistroCompleto } from '@/lib/types'
import ShareButton from './ShareButton'
import DeleteObraButton from './DeleteObraButton'

const climaIcon: Record<string, string> = {
  sol: '☀️', nublado: '🌤️', chuva: '🌧️', tempestade: '⛈️', ventoso: '💨',
}

const statusColor: Record<string, string> = {
  ativa: 'bg-green-100 text-green-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-gray-100 text-gray-600',
}

export default async function ObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obra } = await supabase
    .from('obras')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!obra) notFound()

  const { data: registros } = await supabase
    .from('registros')
    .select('*, fotos(id, url), equipe_dia(id), ocorrencias(id)')
    .eq('obra_id', id)
    .order('data', { ascending: false })

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/share/${obra.share_token}`

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/obras" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{obra.nome}</h1>
          {obra.endereco && <p className="text-xs text-gray-500 truncate">{obra.endereco}</p>}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusColor[obra.status]}`}>
          {obra.status}
        </span>
        <Link href={`/obras/${id}/editar`}>
          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-300 transition">
            <Pencil size={16} />
          </button>
        </Link>
        <DeleteObraButton obraId={id} />
      </div>

      <div className="flex gap-2 mb-5">
        <Link href={`/obras/${id}/novo-registro`} className="flex-1">
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition text-sm">
            <Plus size={18} /> Novo Registro
          </button>
        </Link>
        <ShareButton url={shareUrl} />
        <Link href={`/obras/${id}/relatorio`}>
          <button className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Relatório
          </button>
        </Link>
      </div>

      {(!registros || registros.length === 0) ? (
        <div className="text-center py-16 text-gray-400">
          <p>Nenhum registro ainda</p>
          <p className="text-sm mt-1">Adicione o primeiro registro do dia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registros.map((reg: RegistroCompleto & { fotos: { id: string; url: string }[]; equipe_dia: { id: string }[]; ocorrencias: { id: string }[] }) => (
            <Link key={reg.id} href={`/obras/${id}/registros/${reg.id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-sm">
                    {format(parseISO(reg.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <span className="text-lg">
                    {reg.clima ? climaIcon[reg.clima] : ''}
                    {reg.temperatura ? ` ${reg.temperatura}°C` : ''}
                  </span>
                </div>
                {reg.descricao && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{reg.descricao}</p>
                )}
                <div className="flex gap-3 text-xs text-gray-400">
                  {reg.fotos?.length > 0 && (
                    <span className="flex items-center gap-1"><ImageIcon size={12} /> {reg.fotos.length} foto{reg.fotos.length > 1 ? 's' : ''}</span>
                  )}
                  {reg.equipe_dia?.length > 0 && (
                    <span className="flex items-center gap-1"><Users size={12} /> {reg.equipe_dia.length} trab.</span>
                  )}
                  {reg.ocorrencias?.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={12} /> {reg.ocorrencias.length} ocorr.</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
