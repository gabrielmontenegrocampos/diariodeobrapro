'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, X, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { use } from 'react'
import { maskCEP, buscarCEP } from '@/lib/masks'
import { LoadingOverlay, LoadingButton } from '@/components/LoadingOverlay'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const TIPOS_OBRA = ['Construção','Reforma','Ampliação','Demolição','Manutenção','Pintura','Instalação','Outro']
const STATUS_OPTS = [{ v: 'ativa', l: '🟢 Ativa' }, { v: 'pausada', l: '🟡 Pausada' }, { v: 'concluida', l: '⚫ Concluída' }]

export default function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [error, setError] = useState('')
  const [capaAtual, setCapaAtual] = useState<string | null>(null)
  const [capaFile, setCapaFile] = useState<File | null>(null)
  const [capaPreview, setCapaPreview] = useState<string | null>(null)
  const [removeCapa, setRemoveCapa] = useState(false)

  const [nome, setNome] = useState('')
  const [tipoObra, setTipoObra] = useState('')
  const [status, setStatus] = useState('ativa')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorContrato, setValorContrato] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [artRrt, setArtRrt] = useState('')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from('obras').select('*').eq('id', id).single()
      if (o) {
        setNome(o.nome || '')
        setTipoObra(o.tipo_obra || '')
        setStatus(o.status || 'ativa')
        setDataInicio(o.data_inicio || '')
        setDataFim(o.data_previsao_fim || '')
        setValorContrato(o.valor_contrato ? (o.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
        setResponsavel(o.responsavel_tecnico || '')
        setArtRrt(o.art_rrt || '')
        setCep(o.cep || '')
        setLogradouro(o.logradouro || '')
        setNumero(o.numero || '')
        setComplemento(o.complemento || '')
        setBairro(o.bairro || '')
        setCidade(o.cidade || '')
        setEstado(o.estado || '')
        setCapaAtual(o.foto_capa || null)
      }
      setFetching(false)
    }
    load()
  }, [id])

  function handleCapaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCapaFile(file); setCapaPreview(URL.createObjectURL(file)); setRemoveCapa(false)
    e.target.value = ''
  }

  async function handleBuscarCEP() {
    setBuscandoCEP(true)
    const dados = await buscarCEP(cep)
    if (dados) { setLogradouro(dados.logradouro); setBairro(dados.bairro); setCidade(dados.cidade); setEstado(dados.estado) }
    else setError('CEP não encontrado.')
    setBuscandoCEP(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let fotoCapa = capaAtual
      if (capaFile) {
        const ext = capaFile.name.split('.').pop()
        const path = `capas/${id}/capa.${ext}`
        const { data: upload } = await supabase.storage.from('fotos').upload(path, capaFile, { upsert: true })
        if (upload) { const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path); fotoCapa = publicUrl }
      } else if (removeCapa) { fotoCapa = null }

      const { error } = await supabase.from('obras').update({
        nome, status, tipo_obra: tipoObra || null,
        data_inicio: dataInicio || null,
        data_previsao_fim: dataFim || null,
        valor_contrato: valorContrato ? parseFloat(valorContrato.replace(/\./g, '').replace(',', '.')) : null,
        responsavel_tecnico: responsavel || null,
        art_rrt: artRrt || null,
        cep: cep || null, logradouro: logradouro || null,
        numero: numero || null, complemento: complemento || null,
        bairro: bairro || null, cidade: cidade || null, estado: estado || null,
        endereco: [logradouro, numero, bairro, cidade, estado].filter(Boolean).join(', ') || null,
        foto_capa: fotoCapa,
      }).eq('id', id)

      if (error) throw new Error(error.message)
      router.push(`/obras/${id}`)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.')
      setLoading(false)
    }
  }

  const imagemExibida = capaPreview || (!removeCapa ? capaAtual : null)
  if (fetching) return <LoadingOverlay message="Carregando obra..." />

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/obras/${id}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Editar Obra</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Capa */}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleCapaChange} className="hidden" />
        {imagemExibida ? (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden">
            <Image src={imagemExibida} alt="Capa" fill className="object-cover" />
            <button type="button" onClick={() => { setCapaFile(null); setCapaPreview(null); setRemoveCapa(true) }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"><X size={14} /></button>
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded-xl px-3 py-1.5 flex items-center gap-1"><Camera size={12} /> Trocar</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition">
            <Camera size={24} /><span className="text-sm">Adicionar foto de capa</span>
          </button>
        )}

        {/* Identificação */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identificação</p>
          <div>
            <label className={labelCls}>Nome da obra *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo de obra</label>
            <select value={tipoObra} onChange={e => setTipoObra(e.target.value)} className={inputCls}>
              <option value="">Selecione...</option>
              {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <div className="flex gap-2">
              {STATUS_OPTS.map(opt => (
                <button key={opt.v} type="button" onClick={() => setStatus(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition ${status === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 text-gray-700'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Endereço da obra</p>
          <div>
            <label className={labelCls}>CEP</label>
            <div className="flex gap-2">
              <input type="text" value={cep} onChange={e => setCep(maskCEP(e.target.value))} placeholder="00000-000" className={inputCls} />
              <button type="button" onClick={handleBuscarCEP} disabled={buscandoCEP} className="px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-60 shrink-0">
                {buscandoCEP ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
          </div>
          <div><label className={labelCls}>Logradouro</label><input type="text" value={logradouro} onChange={e => setLogradouro(e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelCls}>Número</label><input type="text" value={numero} onChange={e => setNumero(e.target.value)} className={inputCls} /></div>
            <div className="col-span-2"><label className={labelCls}>Complemento</label><input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>Bairro</label><input type="text" value={bairro} onChange={e => setBairro(e.target.value)} className={inputCls} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><label className={labelCls}>Cidade</label><input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className={inputCls}>
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Datas e contrato */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datas e contrato</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Data de início</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Previsão de término</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>Valor do contrato (R$)</label>
            <input type="text" value={valorContrato} onChange={e => {
              const v = e.target.value.replace(/\D/g, '')
              setValorContrato(v ? (parseInt(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
            }} placeholder="0,00" className={inputCls} />
          </div>
        </div>

        {/* Técnico */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Responsabilidade técnica</p>
          <div><label className={labelCls}>Responsável técnico</label><input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>ART / RRT</label><input type="text" value={artRrt} onChange={e => setArtRrt(e.target.value)} className={inputCls} /></div>
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3.5 transition disabled:opacity-60">
          {loading ? <LoadingButton message="Salvando alterações..." /> : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  )
}
