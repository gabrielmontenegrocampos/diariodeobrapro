'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2, Camera } from 'lucide-react'
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

type WorkerRow = { id?: string; nome: string; funcao: string; horas: string }
type OcorrenciaRow = { id?: string; descricao: string; tipo: string; severidade: string }
type FotoExistente = { id: string; url: string }

export default function EditarRegistroPage({ params }: { params: Promise<{ id: string; registroId: string }> }) {
  const { id: obraId, registroId } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  const [data, setData] = useState('')
  const [clima, setClima] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fotosExistentes, setFotosExistentes] = useState<FotoExistente[]>([])
  const [fotosRemovidas, setFotosRemovidas] = useState<string[]>([])
  const [fotasNovas, setFotasNovas] = useState<{ file: File; preview: string }[]>([])
  const [equipe, setEquipe] = useState<WorkerRow[]>([])
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRow[]>([])

  useEffect(() => {
    async function load() {
      const { data: reg } = await supabase
        .from('registros')
        .select('*, fotos(*), equipe_dia(*), ocorrencias(*)')
        .eq('id', registroId)
        .single()

      if (reg) {
        setData(reg.data)
        setClima(reg.clima || '')
        setTemperatura(reg.temperatura?.toString() || '')
        setDescricao(reg.descricao || '')
        setFotosExistentes(reg.fotos || [])
        setEquipe((reg.equipe_dia || []).map((w: any) => ({
          id: w.id, nome: w.nome, funcao: w.funcao || '', horas: w.horas?.toString() || '',
        })))
        setOcorrencias((reg.ocorrencias || []).map((o: any) => ({
          id: o.id, descricao: o.descricao, tipo: o.tipo, severidade: o.severidade,
        })))
      }
      setFetching(false)
    }
    load()
  }, [registroId])

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setFotasNovas(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
    e.target.value = ''
  }

  function removeExistingPhoto(id: string) {
    setFotosExistentes(prev => prev.filter(f => f.id !== id))
    setFotosRemovidas(prev => [...prev, id])
  }

  function updateWorker(i: number, field: keyof WorkerRow, value: string) {
    setEquipe(prev => prev.map((w, idx) => idx === i ? { ...w, [field]: value } : w))
  }

  function updateOcorrencia(i: number, field: keyof OcorrenciaRow, value: string) {
    setOcorrencias(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Update registro
    const { error: regError } = await supabase
      .from('registros')
      .update({
        data,
        clima: clima || null,
        temperatura: temperatura ? parseInt(temperatura) : null,
        descricao: descricao || null,
      })
      .eq('id', registroId)

    if (regError) { setError('Erro ao salvar.'); setLoading(false); return }

    // Remove fotos excluídas
    if (fotosRemovidas.length > 0) {
      await supabase.from('fotos').delete().in('id', fotosRemovidas)
    }

    // Upload novas fotos
    for (const foto of fotasNovas) {
      const ext = foto.file.name.split('.').pop()
      const path = `${user.id}/${registroId}/${Date.now()}.${ext}`
      const { data: upload } = await supabase.storage.from('fotos').upload(path, foto.file)
      if (upload) {
        const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
        await supabase.from('fotos').insert({ registro_id: registroId, url: publicUrl })
      }
    }

    // Equipe: apaga tudo e re-insere
    await supabase.from('equipe_dia').delete().eq('registro_id', registroId)
    const equipeValida = equipe.filter(w => w.nome.trim())
    if (equipeValida.length > 0) {
      await supabase.from('equipe_dia').insert(
        equipeValida.map(w => ({
          registro_id: registroId,
          nome: w.nome,
          funcao: w.funcao || null,
          horas: w.horas ? parseFloat(w.horas) : null,
        }))
      )
    }

    // Ocorrências: apaga tudo e re-insere
    await supabase.from('ocorrencias').delete().eq('registro_id', registroId)
    const ocorrValidas = ocorrencias.filter(o => o.descricao.trim())
    if (ocorrValidas.length > 0) {
      await supabase.from('ocorrencias').insert(
        ocorrValidas.map(o => ({
          registro_id: registroId,
          descricao: o.descricao,
          tipo: o.tipo,
          severidade: o.severidade,
        }))
      )
    }

    router.push(`/obras/${obraId}/registros/${registroId}`)
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/obras/${obraId}/registros/${registroId}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar Registro</h1>
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
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {/* Fotos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fotos</label>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={addPhoto} className="hidden" />
          {(fotosExistentes.length > 0 || fotasNovas.length > 0) && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {fotosExistentes.map(f => (
                <div key={f.id} className="relative aspect-square">
                  <Image src={f.url} alt="" fill className="object-cover rounded-lg" />
                  <button type="button" onClick={() => removeExistingPhoto(f.id)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {fotasNovas.map((f, i) => (
                <div key={i} className="relative aspect-square">
                  <Image src={f.preview} alt="" fill className="object-cover rounded-lg" />
                  <button type="button" onClick={() => setFotasNovas(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
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
            <Camera size={18} /> Adicionar fotos
          </button>
        </div>

        {/* Equipe */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Equipe do dia</label>
          <div className="space-y-2">
            {equipe.map((w, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-1.5">
                  <input type="text" value={w.nome} onChange={e => updateWorker(i, 'nome', e.target.value)} placeholder="Nome"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  <input type="text" value={w.funcao} onChange={e => updateWorker(i, 'funcao', e.target.value)} placeholder="Função"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  <input type="number" value={w.horas} onChange={e => updateWorker(i, 'horas', e.target.value)} placeholder="Horas" min="0" step="0.5"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                </div>
                <button type="button" onClick={() => setEquipe(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 mt-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setEquipe(prev => [...prev, { nome: '', funcao: '', horas: '' }])}
            className="mt-2 text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
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
                  <input type="text" value={o.descricao} onChange={e => updateOcorrencia(i, 'descricao', e.target.value)} placeholder="Descrição"
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  <button type="button" onClick={() => setOcorrencias(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <select value={o.tipo} onChange={e => updateOcorrencia(i, 'tipo', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    <option value="observacao">Observação</option>
                    <option value="desvio">Desvio</option>
                    <option value="problema">Problema</option>
                  </select>
                  <select value={o.severidade} onChange={e => updateOcorrencia(i, 'severidade', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setOcorrencias(prev => [...prev, { descricao: '', tipo: 'observacao', severidade: 'baixa' }])}
            className="mt-2 text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
            <Plus size={14} /> Adicionar ocorrência
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3.5 transition disabled:opacity-60 text-base"
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  )
}
