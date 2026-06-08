import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { HardHat, MapPin, Calendar, Users, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const climaIcon: Record<string, string> = {
  sol: '☀️', nublado: '🌤️', chuva: '🌧️', tempestade: '⛈️', ventoso: '💨',
}
const severidadeColor: Record<string, string> = {
  baixa: 'bg-blue-100 text-blue-700',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-red-100 text-red-700',
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: obra } = await supabase
    .from('obras')
    .select('*')
    .eq('share_token', token)
    .single()

  if (!obra) notFound()

  const { data: registros } = await supabase
    .from('registros')
    .select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
    .eq('obra_id', obra.id)
    .order('data', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-orange-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <HardHat size={22} />
          </div>
          <div>
            <p className="text-xs text-orange-100 font-medium">Diário de Obra</p>
            <h1 className="text-lg font-bold">{obra.nome}</h1>
            {obra.endereco && (
              <p className="text-xs text-orange-100 flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {obra.endereco}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          {obra.data_inicio && (
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Início: {format(parseISO(obra.data_inicio), 'dd/MM/yyyy')}
            </span>
          )}
          <span>{registros?.length || 0} registro{registros?.length !== 1 ? 's' : ''}</span>
        </div>

        {(!registros || registros.length === 0) ? (
          <p className="text-center text-gray-400 py-12">Nenhum registro ainda.</p>
        ) : (
          <div className="space-y-4">
            {registros.map((reg: any) => (
              <div key={reg.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm capitalize">
                    {format(parseISO(reg.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  {reg.clima && (
                    <span className="text-base">
                      {climaIcon[reg.clima]}{reg.temperatura ? ` ${reg.temperatura}°C` : ''}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {reg.descricao && (
                    <p className="text-sm text-gray-700 leading-relaxed">{reg.descricao}</p>
                  )}

                  {reg.fotos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {reg.fotos.map((f: any) => (
                        <div key={f.id} className="relative aspect-square">
                          <Image src={f.url} alt="" fill className="object-cover rounded-lg" />
                        </div>
                      ))}
                    </div>
                  )}

                  {reg.equipe_dia?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <Users size={11} /> Equipe
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {reg.equipe_dia.map((w: any) => (
                          <span key={w.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                            {w.nome}{w.funcao ? ` · ${w.funcao}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {reg.ocorrencias?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <AlertTriangle size={11} /> Ocorrências
                      </p>
                      <div className="space-y-1">
                        {reg.ocorrencias.map((o: any) => (
                          <div key={o.id} className="flex items-start gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded font-medium shrink-0 ${severidadeColor[o.severidade]}`}>
                              {o.severidade}
                            </span>
                            <span className="text-gray-700">{o.descricao}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Gerado por Diário de Obra Pro
        </p>
      </div>
    </div>
  )
}
