'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function NovaObraPage() {
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [capaFile, setCapaFile] = useState<File | null>(null)
  const [capaPreview, setCapaPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleCapaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCapaFile(file)
    setCapaPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: obraData, error: obraError } = await supabase
        .from('obras')
        .insert({ user_id: session.user.id, nome, endereco: endereco || null, data_inicio: dataInicio || null, status: 'ativa' })
        .select()
        .single()

      if (obraError) throw new Error(obraError.message)

      if (capaFile) {
        const ext = capaFile.name.split('.').pop()
        const path = `capas/${obraData.id}/capa.${ext}`
        const { data: upload } = await supabase.storage.from('fotos').upload(path, capaFile, { upsert: true })
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
          await supabase.from('obras').update({ foto_capa: publicUrl }).eq('id', obraData.id)
        }
      }

      router.push(`/obras/${obraData.id}`)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar obra. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/obras" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nova Obra</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Foto de capa */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleCapaChange} className="hidden" />
          {capaPreview ? (
            <div className="relative w-full h-44 rounded-2xl overflow-hidden">
              <Image src={capaPreview} alt="Capa" fill className="object-cover" />
              <button
                type="button"
                onClick={() => { setCapaFile(null); setCapaPreview(null) }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded-xl px-3 py-1.5 flex items-center gap-1"
              >
                <Camera size={12} /> Trocar
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
              <span className="text-xs">Ajuda a identificar a obra rapidamente</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da obra *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Reforma Apartamento 302"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input
              type="text"
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
              placeholder="Rua, número, cidade"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3 transition disabled:opacity-60"
        >
          {loading ? 'Criando...' : 'Criar Obra'}
        </button>
      </form>
    </div>
  )
}
