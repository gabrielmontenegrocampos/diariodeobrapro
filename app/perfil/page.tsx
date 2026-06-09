'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Camera, X, Eye, EyeOff, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import AppBar from '@/components/AppBar'
import { LoadingOverlay, LoadingButton } from '@/components/LoadingOverlay'
import { maskPhone } from '@/lib/masks'

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const fotoRef = useRef<HTMLInputElement>(null)

  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [successSenha, setSuccessSenha] = useState('')
  const [errorSenha, setErrorSenha] = useState('')

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenhas, setShowSenhas] = useState(false)

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2a5298]"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      setUserId(session.user.id)
      setEmail(session.user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile) {
        setNome(profile.nome || session.user.user_metadata?.name || '')
        setTelefone(profile.telefone || '')
        setCargo(profile.cargo || '')
        setFotoUrl(profile.foto_url || null)
      } else {
        setNome(session.user.user_metadata?.name || '')
      }
      setFetching(false)
    }
    load()
  }, [])

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      let novaFotoUrl = fotoUrl

      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop()
        const path = `perfis/${userId}/foto.${ext}`
        const { data: upload } = await supabase.storage
          .from('fotos').upload(path, fotoFile, { upsert: true })
        if (upload) {
          const { data: { publicUrl } } = supabase.storage.from('fotos').getPublicUrl(path)
          novaFotoUrl = publicUrl
          setFotoUrl(publicUrl)
        }
      }

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        nome: nome.trim(),
        email,
        telefone: telefone || null,
        cargo: cargo || null,
        foto_url: novaFotoUrl,
      }, { onConflict: 'id' })

      if (upsertError) throw new Error(upsertError.message)

      // Atualiza metadata do auth também
      await supabase.auth.updateUser({ data: { name: nome.trim() } })

      setSuccess('Dados salvos com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) { setErrorSenha('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setErrorSenha('A senha deve ter pelo menos 6 caracteres.'); return }

    setLoadingSenha(true)
    setErrorSenha('')
    setSuccessSenha('')

    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw new Error(error.message)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setSuccessSenha('Senha alterada com sucesso!')
      setTimeout(() => setSuccessSenha(''), 3000)
    } catch (err: any) {
      setErrorSenha(err.message || 'Erro ao alterar senha.')
    } finally {
      setLoadingSenha(false)
    }
  }

  const fotoExibida = fotoPreview || fotoUrl

  if (fetching) return <LoadingOverlay message="Carregando perfil..." />

  return (
    <div className="min-h-screen pb-24">
      <AppBar subtitle="Meu Perfil" />
      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/obras" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto de perfil */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Foto de perfil</p>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 shrink-0">
                {fotoExibida ? (
                  <>
                    <Image src={fotoExibida} alt="Foto" fill className="object-cover" unoptimized />
                    <button type="button"
                      onClick={() => { setFotoFile(null); setFotoPreview(null); setFotoUrl(null) }}
                      className="absolute top-0 right-0 bg-black/50 text-white rounded-full p-0.5">
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={28} />
                  </div>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fotoRef.current?.click()}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-[#93b8e0] hover:text-[#1e3a5f] transition flex items-center gap-2">
                  <Camera size={14} />
                  {fotoExibida ? 'Trocar foto' : 'Adicionar foto'}
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG ou JPG</p>
              </div>
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados pessoais</p>

            <div>
              <label className={labelCls}>E-mail</label>
              <input type="text" value={email} disabled
                className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>

            <div>
              <label className={labelCls}>Nome completo *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                required placeholder="Seu nome" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input type="text" value={telefone}
                onChange={e => setTelefone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Cargo / Função</label>
              <input type="text" value={cargo} onChange={e => setCargo(e.target.value)}
                placeholder="Ex: Engenheiro, Arquiteto, Mestre de obras..." className={inputCls} />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}
          {success && <p className="text-green-600 text-sm px-1 font-medium">✓ {success}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#152e48] text-white font-semibold rounded-xl py-3.5 transition disabled:opacity-60">
            {loading ? <LoadingButton message="Salvando..." /> : 'Salvar Dados'}
          </button>
        </form>

        {/* Alterar senha */}
        <form onSubmit={handleAlterarSenha} className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Alterar senha</p>
            <button type="button" onClick={() => setShowSenhas(v => !v)}
              className="text-xs text-[#1e3a5f] hover:text-[#152e48]">
              {showSenhas ? 'Fechar' : 'Alterar'}
            </button>
          </div>

          {showSenhas && (
            <>
              <div>
                <label className={labelCls}>Nova senha</label>
                <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Confirmar nova senha</label>
                <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha" className={inputCls} />
              </div>
              {errorSenha && <p className="text-red-500 text-xs">{errorSenha}</p>}
              {successSenha && <p className="text-green-600 text-xs font-medium">✓ {successSenha}</p>}
              <button type="submit" disabled={loadingSenha}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl py-2.5 text-sm transition disabled:opacity-60">
                {loadingSenha ? <LoadingButton message="Alterando..." /> : 'Confirmar nova senha'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
