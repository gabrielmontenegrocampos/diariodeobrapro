'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { use } from 'react'

const statusOptions = [
  { value: 'ativa', label: '🟢 Ativa' },
  { value: 'pausada', label: '🟡 Pausada' },
  { value: 'concluida', label: '⚫ Concluída' },
]

export default function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [status, setStatus] = useState('ativa')
  const [capaAtual, setCapaAtual] = useState<string | null>(null)
  const [capaFile, setCapaFile] = useState<File | null>(null)
  const [capaPreview, setCapaPreview] = useState<string | null>(null)
  const [removeCapa, setRemoveCapa] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: obra } = await supabase.from('obras').select('*').eq('id', id).single()
      if (obra) {
        setNome(obra.nome)
        setEndereco(obra.endereco || '')
        setDataInicio(obra.data_inicio || '')
        setStatus(obra.status)
        setCapaAtual(obra.foto_capa || null)
      }
      setFetching(false)
    }
    load()
  }, [id])

  function handleCapaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCapaFile(file)
    setCapaPreview(URL.createObjectURL(file))
    setRemoveCapa(false)
    e.target.value = ''
  }

  function handleRemoveCapa() {
    setCapaFile(null)
    setCapaPreview(null)
    setRemoveCapa(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let fotoCapa = capaAtual

    if (capaFile) {
      const ext = capaFile.name.split('.').pop()
      const path = `capas/${id}/capa.${ext}`
      const { data: upload } = await supabase.storage.from('fotos').upload(path, capaFile, { upsert: true })
      if (upload) {
        const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
        fotoCapa = publicUrl
      }
    } else if (removeCapa) {
      fotoCapa = null
    }

    const { error } = await supabase
      .from('obras')
      .update({ nome, endereco: endereco || null, data_inicio: dataInicio || null, status, foto_capa: fotoCapa })
      .eq('id', id)

    if (error) {
      setError('Erro ao salvar. Tente novamente.')
      setLoading(false)
    } else {
      router.push(`/obras/${id}`)
    }
  }

  const imagemExibida = capaPreview || (!removeCapa ? capaAtual : null)

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/obras/${id}`} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar Obra</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Foto de capa */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCapaChange} className="hidden" />
          {imagemExibida ? (
            <div className="relative w-full h-44 rounded-2xl overflow-hidden">
              <Image src={imagemExibida} alt="Capa" fill className="object-cover" />
              <button type="button" onClick={handleRemoveCapa} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5">
                <X size={14} />
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded-xl px-3 py-1.5 flex items-center gap-1">
                <Camera size={12} /> Trocar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition"
            >
              <Camera size={28} />
              <span className="text-sm font-medium">Adicionar foto de capa</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da obra *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, número, cidade"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex gap-2">
              {statusOptions.map(opt => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm border transition ${status === opt.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3 transition disabled:opacity-60">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  )
}
