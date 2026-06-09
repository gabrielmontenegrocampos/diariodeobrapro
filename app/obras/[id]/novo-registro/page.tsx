'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Camera, Play } from 'lucide-react'
import AppBar from '@/components/AppBar'
import { LoadingOverlay, LoadingButton } from '@/components/LoadingOverlay'
import Link from 'next/link'
import Image from 'next/image'
import { use } from 'react'

const climaOptions = [
  { value: 'sol', label: '☀️ Sol' },
  { value: 'nublado', label: '🌤️ Nublado' },
  { value: 'chuva', label: '🌧️ Chuva' },
  { value: 'tempestade', label: '⛈️ Tempestade' },
  { value: 'ventoso', label: '💨 Ventoso' },
]

type WorkerRow = { nome: string; funcao: string; horas: string }
type OcorrenciaRow = { descricao: string; tipo: string; severidade: string }

export default function NovoRegistroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: obraId } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const [data, setData] = useState(today)
  const [clima, setClima] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fotos, setFotos] = useState<{ file: File; preview: string; tipo: string }[]>([])
  const [equipe, setEquipe] = useState<WorkerRow[]>([{ nome: '', funcao: '', horas: '' }])
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRow[]>([])
  const [progresso, setProgresso] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const medias = files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      tipo: f.type.startsWith('video/') ? 'video' : 'foto',
    }))
    setFotos(prev => [...prev, ...medias])
    e.target.value = ''
  }

  function removePhoto(i: number) {
    setFotos(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateWorker(i: number, field: keyof WorkerRow, value: string) {
    setEquipe(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w))
  }

  function addWorker() {
    setEquipe(prev => [...prev, { nome: '', funcao: '', horas: '' }])
  }

  function removeWorker(i: number) {
    setEquipe(prev => prev.filter((_, idx) => idx !== i))
  }

  function addOcorrencia() {
    setOcorrencias(prev => [...prev, { descricao: '', tipo: 'observacao', severidade: 'baixa' }])
  }

  function updateOcorrencia(i: number, field: keyof OcorrenciaRow, value: string) {
    setOcorrencias(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }

  function removeOcorrencia(i: number) {
    setOcorrencias(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: registro, error: regError } = await supabase
        .from('registros')
        .insert({
          obra_id: obraId,
          user_id: session.user.id,
          data,
          clima: clima || null,
          temperatura: temperatura ? parseInt(temperatura) : null,
          descricao: descricao || null,
          progresso: progresso !== null ? progresso : null,
        })
        .select()
        .single()

      if (regError) throw new Error(regError.message)

      // Atualiza progresso_atual da obra se informado
      if (progresso !== null) {
        await supabase.from('obras').update({ progresso_atual: progresso }).eq('id', obraId)
      }

      for (const foto of fotos) {
        const ext = foto.file.name.split('.').pop()
        const path = `${session.user.id}/${registro.id}/${Date.now()}.${ext}`
        const { data: upload } = await supabase.storage.from('fotos').upload(path, foto.file)
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
          await supabase.from('fotos').insert({ registro_id: registro.id, url: publicUrl, tipo: foto.tipo })
        }
      }

      const equipeValida = equipe.filter(w => w.nome.trim())
      if (equipeValida.length > 0) {
        await supabase.from('equipe_dia').insert(
          equipeValida.map(w => ({
            registro_id: registro.id,
            nome: w.nome,
            funcao: w.funcao || null,
            horas: w.horas ? parseFloat(w.horas) : null,
          }))
        )
      }

      const ocorrValidas = ocorrencias.filter(o => o.descricao.trim())
      if (ocorrValidas.length > 0) {
        await supabase.from('ocorrencias').insert(
          ocorrValidas.map(o => ({
            registro_id: registro.id,
            descricao: o.descricao,
            tipo: o.tipo,
            severidade: o.severidade,
          }))
        )
      }

      router.push(`/obras/${obraId}`)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar registro. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <AppBar subtitle="Novo Registro" />
      <div className="max-w-lg mx-auto px-4 py-5">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/obras/${obraId}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novo Registro</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Data e Clima */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clima</label>
            <div className="flex flex-wrap gap-2">
              {climaOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setClima(clima === opt.value ? '' : opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                    clima === opt.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura (°C)</label>
            <input
              type="number"
              value={temperatura}
              onChange={e => setTemperatura(e.target.value)}
              placeholder="Ex: 28"
              className="w-32 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do dia</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descreva as atividades realizadas no dia..."
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {/* Avanço físico */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Avanço físico da obra</label>
            <span className="text-xs text-gray-400">opcional</span>
          </div>
          {progresso === null ? (
            <button type="button" onClick={() => setProgresso(50)}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition">
              + Informar % de avanço
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold" style={{ color: progresso < 30 ? '#ef4444' : progresso < 70 ? '#f97316' : '#22c55e' }}>
                  {progresso}%
                </span>
                <button type="button" onClick={() => setProgresso(null)}
                  className="text-xs text-gray-400 hover:text-gray-600">remover</button>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={progresso}
                onChange={e => setProgresso(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: progresso < 30 ? '#ef4444' : progresso < 70 ? '#f97316' : '#22c55e' }}
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
          )}
        </div>

        {/* Fotos e Vídeos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fotos e Vídeos</label>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={addPhoto} className="hidden" />
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {f.tipo === 'video' ? (
                    <>
                      <video src={f.preview} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play size={16} className="text-white fill-white" />
                      </div>
                    </>
                  ) : (
                    <Image src={f.preview} alt="" fill className="object-cover" />
                  )}
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500 transition flex items-center justify-center gap-2"
          >
            <Camera size={18} /> Adicionar fotos e vídeos
          </button>
        </div>

        {/* Equipe */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Equipe do dia</label>
          <div className="space-y-2">
            {equipe.map((w, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={w.nome}
                    onChange={e => updateWorker(i, 'nome', e.target.value)}
                    placeholder="Nome"
                    className="col-span-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                  <input
                    type="text"
                    value={w.funcao}
                    onChange={e => updateWorker(i, 'funcao', e.target.value)}
                    placeholder="Função"
                    className="col-span-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                  <input
                    type="number"
                    value={w.horas}
                    onChange={e => updateWorker(i, 'horas', e.target.value)}
                    placeholder="Horas"
                    min="0"
                    step="0.5"
                    className="col-span-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
                <button type="button" onClick={() => removeWorker(i)} className="text-gray-300 hover:text-red-400 mt-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addWorker}
            className="mt-2 text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
          >
            <Plus size={14} /> Adicionar trabalhador
          </button>
        </div>

        {/* Ocorrências */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Ocorrências</label>
          <div className="space-y-3">
            {ocorrencias.map((o, i) => (
              <div key={i} className="space-y-1.5 p-3 bg-gray-50 rounded-xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={o.descricao}
                    onChange={e => updateOcorrencia(i, 'descricao', e.target.value)}
                    placeholder="Descrição da ocorrência"
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                  <button type="button" onClick={() => removeOcorrencia(i)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={o.tipo}
                    onChange={e => updateOcorrencia(i, 'tipo', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="observacao">Observação</option>
                    <option value="desvio">Desvio</option>
                    <option value="problema">Problema</option>
                  </select>
                  <select
                    value={o.severidade}
                    onChange={e => updateOcorrencia(i, 'severidade', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOcorrencia}
            className="mt-2 text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
          >
            <Plus size={14} /> Adicionar ocorrência
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3.5 transition disabled:opacity-60 text-base"
        >
          {loading ? <LoadingButton message="Salvando..." /> : 'Salvar Registro'}
        </button>
      </form>
      </div>
    </div>
  )
}
