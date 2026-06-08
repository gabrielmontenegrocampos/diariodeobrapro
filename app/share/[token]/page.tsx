import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { HardHat, MapPin, Calendar, Users, AlertTriangle, Phone, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const climaIcon: Record<string, string> = {
  sol: '☀️', nublado: '🌤️', chuva: '🌧️', tempestade: '⛈️', ventoso: '💨',
}
const severidadeColor: Record<string, string> = {
  baixa: 'bg-blue-50 text-blue-600 border border-blue-200',
  media: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  alta: 'bg-red-50 text-red-600 border border-red-200',
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: obra } = await supabase
    .from('obras').select('*').eq('share_token', token).single()
  if (!obra) notFound()

  const [{ data: registros }, { data: empresa }] = await Promise.all([
    supabase.from('registros')
      .select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
      .eq('obra_id', obra.id).order('data', { ascending: false }),
    supabase.from('empresas').select('*').eq('user_id', obra.user_id).maybeSingle(),
  ])

  const enderecoObra = [obra.logradouro, obra.numero, obra.bairro, obra.cidade, obra.estado]
    .filter(Boolean).join(', ') || obra.endereco || ''
  const enderecoEmpresa = empresa
    ? [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado]
        .filter(Boolean).join(', ')
    : ''

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Cabeçalho laranja */}
      <div className="bg-orange-500 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-2xl shrink-0">
            <HardHat size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-orange-100 font-medium tracking-wide">Diário de Obra</p>
            <h1 className="text-xl font-bold leading-tight truncate">{obra.nome}</h1>
            {enderecoObra && (
              <p className="text-xs text-orange-100 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={11} className="shrink-0" /> {enderecoObra}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Dados da empresa/prestador */}
        {empresa?.razao_social && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              {empresa.logo_url ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                  <Image src={empresa.logo_url} alt="Logo" fill className="object-contain p-1" unoptimized />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <HardHat size={22} className="text-orange-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm leading-tight">{empresa.razao_social}</p>
                {empresa.nome_fantasia && (
                  <p className="text-xs text-gray-500">{empresa.nome_fantasia}</p>
                )}
                {empresa.cpf_cnpj && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {empresa.tipo === 'juridica' ? 'CNPJ' : 'CPF'}: {empresa.cpf_cnpj}
                  </p>
                )}
              </div>
            </div>
            {(empresa.telefone || empresa.celular || empresa.email || enderecoEmpresa) && (
              <div className="border-t border-gray-50 px-4 py-3 space-y-1.5">
                {(empresa.telefone || empresa.celular) && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Phone size={11} className="text-gray-400 shrink-0" />
                    {[empresa.telefone, empresa.celular].filter(Boolean).join(' · ')}
                  </p>
                )}
                {empresa.email && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Mail size={11} className="text-gray-400 shrink-0" />
                    {empresa.email}
                  </p>
                )}
                {enderecoEmpresa && (
                  <p className="text-xs text-gray-500 flex items-start gap-1.5">
                    <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />
                    {enderecoEmpresa}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats da obra */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {obra.data_inicio && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-orange-400" />
              Início: {format(parseISO(obra.data_inicio), "dd/MM/yyyy")}
            </span>
          )}
          <span className="text-gray-300">·</span>
          <span>{registros?.length || 0} registro{registros?.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Registros */}
        {(!registros || registros.length === 0) ? (
          <p className="text-center text-gray-400 py-12">Nenhum registro ainda.</p>
        ) : (
          <div className="space-y-4">
            {registros.map((reg: any) => (
              <div key={reg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm capitalize">
                    {format(parseISO(reg.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  {reg.clima && (
                    <span className="text-base font-medium text-gray-600">
                      {climaIcon[reg.clima]} {reg.temperatura ? `${reg.temperatura}°C` : ''}
                    </span>
                  )}
                </div>

                <div className="px-4 pb-4 space-y-3">
                  {reg.descricao && (
                    <p className="text-sm text-gray-700 leading-relaxed">{reg.descricao}</p>
                  )}

                  {reg.fotos?.length > 0 && (
                    <div className={reg.fotos.length === 1
                      ? 'relative w-full rounded-xl overflow-hidden'
                      : `grid gap-1.5 rounded-xl overflow-hidden ${reg.fotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`
                    }>
                      {reg.fotos.map((f: any, i: number) => (
                        <div key={f.id} className={`relative ${reg.fotos.length === 1 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                          <Image src={f.url} alt={f.legenda || `Foto ${i + 1}`} fill className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                  )}

                  {reg.equipe_dia?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Users size={11} /> Equipe
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {reg.equipe_dia.map((w: any) => (
                          <span key={w.id} className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg font-medium">
                            {w.nome}{w.funcao ? ` · ${w.funcao.toUpperCase()}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {reg.ocorrencias?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={11} /> Ocorrências
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {reg.ocorrencias.map((o: any) => (
                          <span key={o.id} className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${severidadeColor[o.severidade]}`}>
                            <span className="font-bold">{o.severidade}</span>
                            <span className="text-gray-600 font-normal">{o.descricao}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">Diário de Obra Pro</p>
      </div>
    </div>
  )
}
