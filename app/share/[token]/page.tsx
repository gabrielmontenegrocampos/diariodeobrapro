import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { HardHat, MapPin, Calendar, Users, AlertTriangle, Phone, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PhotoGallery from '@/components/PhotoGallery'
import ShareCollapsible from '@/components/ShareCollapsible'

const climaIcon: Record<string, string> = {
  sol: '☀️', nublado: '🌤️', chuva: '🌧️', tempestade: '⛈️', ventoso: '💨',
}
const severidadeColor: Record<string, string> = {
  baixa: 'bg-blue-50 text-blue-600 border border-blue-200',
  media: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  alta:  'bg-red-50 text-red-600 border border-red-200',
}

type AtivStatus = 'pendente' | 'em_andamento' | 'concluida'
const ATIV_CFG: Record<AtivStatus, { label: string; cls: string }> = {
  pendente:     { label: 'Pendente',     cls: 'bg-gray-100 text-gray-500' },
  em_andamento: { label: 'Em andamento', cls: 'bg-[#dbeafe] text-[#1e3a5f]' },
  concluida:    { label: 'Concluída ✓',  cls: 'bg-green-100 text-green-700' },
}

const DOC_TIPOS = [
  { value: 'art',      label: 'ART / RRT', icon: '📋' },
  { value: 'seguro',   label: 'Seguro',     icon: '🛡️' },
  { value: 'contrato', label: 'Contrato',   icon: '📝' },
  { value: 'planta',   label: 'Planta',     icon: '📐' },
  { value: 'outro',    label: 'Outro',      icon: '📄' },
]
function docIcon(t: string)  { return DOC_TIPOS.find(x => x.value === t)?.icon  || '📄' }
function docLabel(t: string) { return DOC_TIPOS.find(x => x.value === t)?.label || 'Outro' }
function fmtBytes(b: number) {
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: obra } = await supabase
    .from('obras').select('*').eq('share_token', token).single()
  if (!obra) notFound()

  const [{ data: registros }, { data: empresa }, { data: atividades }, { data: documentos }] =
    await Promise.all([
      supabase.from('registros')
        .select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
        .eq('obra_id', obra.id).order('data', { ascending: false }),
      supabase.from('empresas').select('*').eq('user_id', obra.user_id).maybeSingle(),
      supabase.from('atividades_obra')
        .select('id, etapa, descricao, status, ordem, parent_id')
        .eq('obra_id', obra.id)
        .order('ordem', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('documentos_obra')
        .select('id, tipo, arquivo_url, arquivo_nome, tamanho')
        .eq('obra_id', obra.id).order('created_at', { ascending: false }),
    ])

  const enderecoObra = [obra.logradouro, obra.numero, obra.bairro, obra.cidade, obra.estado]
    .filter(Boolean).join(', ') || obra.endereco || ''
  const enderecoEmpresa = empresa
    ? [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade, empresa.estado]
        .filter(Boolean).join(', ')
    : ''

  // Build activities hierarchy
  type AtvRaw = { id: string; etapa: string; descricao: string | null; status: string; ordem: number; parent_id: string | null }
  const atvList: AtvRaw[] = (atividades as any[]) || []
  const atvGroups = atvList
    .filter(a => !a.parent_id).sort((a, b) => a.ordem - b.ordem)
    .map(p => ({ parent: p, children: atvList.filter(a => a.parent_id === p.id).sort((a, b) => a.ordem - b.ordem) }))
  const svS = (s: string) => s === 'concluida' ? 100 : s === 'em_andamento' ? 50 : 0
  const gPrg = (g: { parent: AtvRaw; children: AtvRaw[] }) =>
    g.children.length
      ? Math.round(g.children.reduce((a, c) => a + svS(c.status), 0) / g.children.length)
      : svS(g.parent.status)

  const progresso   = obra.progresso_atual || 0
  const progColor   = progresso < 30 ? '#ef4444' : progresso < 70 ? '#f97316' : '#22c55e'
  const donePais    = atvGroups.filter(g => gPrg(g) === 100).length
  const hasAtiv     = atvGroups.length > 0
  const hasDocs     = documentos && documentos.length > 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Orange header */}
      <div className="bg-[#1e3a5f] text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-2xl shrink-0"><HardHat size={24} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-200 font-medium tracking-wide">Diário de Obra</p>
            <h1 className="text-xl font-bold leading-tight truncate">{obra.nome}</h1>
            {enderecoObra && (
              <p className="text-xs text-blue-200 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={11} className="shrink-0" /> {enderecoObra}
              </p>
            )}
            {progresso > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-blue-200">Avanço físico</span>
                  <span className="text-xs font-bold text-white">{progresso}%</span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${progresso}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Company card */}
        {empresa?.razao_social && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              {empresa.logo_url ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                  <Image src={empresa.logo_url} alt="Logo" fill className="object-contain p-1" unoptimized />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#eef4fc] flex items-center justify-center shrink-0">
                  <HardHat size={22} className="text-[#2a5298]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-sm leading-tight">{empresa.razao_social}</p>
                {empresa.nome_fantasia && <p className="text-xs text-gray-500">{empresa.nome_fantasia}</p>}
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
                    <Mail size={11} className="text-gray-400 shrink-0" />{empresa.email}
                  </p>
                )}
                {enderecoEmpresa && (
                  <p className="text-xs text-gray-500 flex items-start gap-1.5">
                    <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />{enderecoEmpresa}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {obra.data_inicio && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#2a5298]" />
              Início: {format(parseISO(obra.data_inicio), "dd/MM/yyyy")}
            </span>
          )}
          <span className="text-gray-300">·</span>
          <span>{registros?.length || 0} registro{registros?.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Atividades (collapsible) ── */}
        {hasAtiv && (
          <ShareCollapsible
            header={
              <div>
                <p className="text-sm font-bold text-gray-800">Atividades da Obra</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {donePais}/{atvGroups.length} etapa{atvGroups.length !== 1 ? 's' : ''} concluída{atvGroups.length !== 1 ? 's' : ''}
                </p>
                {progresso > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-400">Avanço físico</span>
                      <span className="text-lg font-bold" style={{ color: progColor }}>{progresso}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${progresso}%`, backgroundColor: progColor }} />
                    </div>
                    {obra.data_previsao_fim && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Previsão de conclusão: {format(parseISO(obra.data_previsao_fim), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            }
          >
            <div className="divide-y divide-gray-50">
              {atvGroups.map((g, gi) => {
                const gp   = gPrg(g)
                const gClr = gp < 30 ? '#ef4444' : gp < 70 ? '#f97316' : '#22c55e'
                return (
                  <div key={g.parent.id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs text-gray-300 font-mono w-4 shrink-0 text-right">{gi + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${gp === 100 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {g.parent.etapa}
                        </p>
                        {g.children.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${gp}%`, backgroundColor: gClr }} />
                            </div>
                            <span className="text-xs font-bold shrink-0" style={{ color: gClr }}>{gp}%</span>
                          </div>
                        )}
                      </div>
                      {g.children.length === 0 && (
                        <span className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl font-semibold ${ATIV_CFG[g.parent.status as AtivStatus].cls}`}>
                          {ATIV_CFG[g.parent.status as AtivStatus].label}
                        </span>
                      )}
                    </div>
                    {g.children.map(child => (
                      <div key={child.id}
                        className="flex items-center gap-3 pl-11 pr-4 py-2.5 border-t border-gray-50"
                        style={{ backgroundColor: '#f0f1f2' }}>
                        <span className="text-xs text-gray-300 shrink-0">└</span>
                        <p className={`flex-1 text-xs font-medium ${child.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {child.etapa}
                        </p>
                        <span className={`shrink-0 text-xs px-2 py-1 rounded-lg font-semibold ${ATIV_CFG[child.status as AtivStatus].cls}`}>
                          {ATIV_CFG[child.status as AtivStatus].label}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </ShareCollapsible>
        )}

        {/* Fallback progress (no activities) */}
        {!hasAtiv && progresso > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avanço físico</p>
                {obra.data_previsao_fim && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Previsão: {format(parseISO(obra.data_previsao_fim), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
              <span className="text-3xl font-bold" style={{ color: progColor }}>{progresso}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progresso}%`, backgroundColor: progColor }} />
            </div>
          </div>
        )}

        {/* ── Documentos (collapsible) ── */}
        {hasDocs && (
          <ShareCollapsible
            header={
              <div>
                <p className="text-sm font-bold text-gray-800">Documentos da Obra</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(documentos as any[]).length} arquivo{(documentos as any[]).length !== 1 ? 's' : ''}
                </p>
              </div>
            }
          >
            <div className="divide-y divide-gray-50">
              {(documentos as any[]).map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{docIcon(doc.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.arquivo_nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {docLabel(doc.tipo)}{doc.tamanho ? ` · ${fmtBytes(doc.tamanho)}` : ''}
                    </p>
                  </div>
                  <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 text-xs text-[#1e3a5f] font-semibold bg-[#eef4fc] px-3 py-1.5 rounded-xl hover:bg-[#dbeafe] transition">
                    ⬇ Baixar
                  </a>
                </div>
              ))}
            </div>
          </ShareCollapsible>
        )}

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
                  {reg.servicos_executados && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Serviços executados</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{reg.servicos_executados}</p>
                    </div>
                  )}
                  {reg.descricao && (
                    <p className="text-sm text-gray-700 leading-relaxed">{reg.descricao}</p>
                  )}
                  {reg.fotos?.length > 0 && <PhotoGallery fotos={reg.fotos} />}
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
