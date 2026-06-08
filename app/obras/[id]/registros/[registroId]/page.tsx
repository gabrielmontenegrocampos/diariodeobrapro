import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Users, AlertTriangle, Pencil } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DeleteRegistroButton from './DeleteRegistroButton'
import PhotoGallery from '@/components/PhotoGallery'

const climaIcon: Record<string, string> = {
  sol: '☀️', nublado: '🌤️', chuva: '🌧️', tempestade: '⛈️', ventoso: '💨',
}
const severidadeColor: Record<string, string> = {
  baixa: 'bg-blue-100 text-blue-700',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-red-100 text-red-700',
}
const tipoLabel: Record<string, string> = {
  problema: 'Problema', desvio: 'Desvio', observacao: 'Observação',
}

export default async function RegistroPage({
  params,
}: {
  params: Promise<{ id: string; registroId: string }>
}) {
  const { id: obraId, registroId } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: registro } = await supabase
    .from('registros')
    .select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
    .eq('id', registroId)
    .eq('obra_id', obraId)
    .single()

  if (!registro) notFound()

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/obras/${obraId}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 capitalize">
            {format(parseISO(registro.data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h1>
          {registro.clima && (
            <p className="text-sm text-gray-500">
              {climaIcon[registro.clima]} {registro.clima.charAt(0).toUpperCase() + registro.clima.slice(1)}
              {registro.temperatura ? ` · ${registro.temperatura}°C` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/obras/${obraId}/registros/${registroId}/editar`}>
            <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-orange-500 hover:border-orange-300 transition">
              <Pencil size={16} />
            </button>
          </Link>
          <DeleteRegistroButton registroId={registroId} obraId={obraId} />
        </div>
      </div>

      <div className="space-y-4">
        {registro.descricao && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Atividades do dia</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{registro.descricao}</p>
          </div>
        )}

        {registro.fotos?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Fotos ({registro.fotos.length})
            </h2>
            <PhotoGallery fotos={registro.fotos} />
          </div>
        )}

        {registro.equipe_dia?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Users size={12} /> Equipe ({registro.equipe_dia.length} trabalhadores)
            </h2>
            <div className="divide-y divide-gray-50">
              {registro.equipe_dia.map((w: { id: string; nome: string; funcao: string | null; horas: number | null }) => (
                <div key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-800">{w.nome}</span>
                    {w.funcao && <span className="text-gray-400 ml-2">· {w.funcao}</span>}
                  </div>
                  {w.horas && <span className="text-gray-500 text-xs">{w.horas}h</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {registro.ocorrencias?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
              <AlertTriangle size={12} /> Ocorrências ({registro.ocorrencias.length})
            </h2>
            <div className="space-y-2">
              {registro.ocorrencias.map((o: { id: string; descricao: string; tipo: string; severidade: string }) => (
                <div key={o.id} className="p-3 bg-gray-50 rounded-xl text-sm">
                  <p className="text-gray-800">{o.descricao}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">{tipoLabel[o.tipo]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severidadeColor[o.severidade]}`}>
                      {o.severidade.charAt(0).toUpperCase() + o.severidade.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
