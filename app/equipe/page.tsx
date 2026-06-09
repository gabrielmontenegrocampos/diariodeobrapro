'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, UserPlus, Trash2, Clock, CheckCircle, Users, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import AppBar from '@/components/AppBar'
import { LoadingOverlay } from '@/components/LoadingOverlay'

type Member = {
  id: string
  member_email: string
  member_id: string | null
  status: 'pending' | 'active'
  created_at: string
}

export default function EquipePage() {
  const router = useRouter()
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [copied, setCopied] = useState(false)

  const cadastroUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/login`
    : 'https://diariodeobrapro.vercel.app/login'

  function copyLink() {
    navigator.clipboard.writeText(cadastroUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setOwnerId(session.user.id)
      await loadMembers(session.user.id)
      setFetching(false)
    }
    load()
  }, [])

  async function loadMembers(uid: string) {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
    setMembers(data || [])
  }

  async function addMember() {
    if (!email.trim() || !ownerId) return
    setLoading(true)
    setError('')
    setSuccess('')

    const emailClean = email.trim().toLowerCase()

    // Não pode adicionar a si mesmo
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user.email === emailClean) {
      setError('Não é possível adicionar seu próprio e-mail.')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('team_members')
      .insert({ owner_id: ownerId, member_email: emailClean })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('Este e-mail já foi convidado.')
      } else {
        setError('Erro ao adicionar membro.')
      }
      setLoading(false)
      return
    }

    // Tenta ativar imediatamente se o usuário já tem conta
    await supabase.rpc('activate_pending_invite', {
      p_owner_id: ownerId,
      p_email: emailClean,
    })

    setEmail('')
    setSuccess(`Membro adicionado! Copie o link acima e envie para ${emailClean} se cadastrar.`)
    await loadMembers(ownerId)
    setLoading(false)
  }

  async function removeMember(id: string) {
    if (!confirm('Remover este membro da equipe?')) return
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  if (fetching) return <LoadingOverlay message="Carregando equipe..." />

  return (
    <div className="min-h-screen">
      <AppBar subtitle="Equipe" />
      <div className="max-w-lg mx-auto px-4 py-5">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/obras" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Gerenciar Equipe</h1>
        </div>

        {/* Info */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-5 space-y-3">
          <p className="text-sm text-orange-800 leading-relaxed">
            Adicione o e-mail do membro abaixo, depois envie o link de cadastro para ele entrar no app.
            Membros podem criar registros mas não podem editar ou excluir obras.
          </p>
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-orange-200 bg-white text-sm font-medium text-orange-600 hover:bg-orange-100 transition"
          >
            {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            {copied ? 'Link copiado!' : 'Copiar link de cadastro'}
          </button>
          {copied && (
            <p className="text-xs text-orange-700 text-center">
              Envie pelo WhatsApp ou e-mail para o membro se cadastrar
            </p>
          )}
        </div>

        {/* Adicionar membro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <UserPlus size={16} className="text-orange-500" /> Convidar membro
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              placeholder="email@exemplo.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={addMember}
              disabled={loading || !email.trim()}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60"
            >
              {loading ? '...' : 'Convidar'}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          {success && <p className="text-green-600 text-xs mt-2">{success}</p>}
        </div>

        {/* Lista de membros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <Users size={15} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">
              {members.length === 0 ? 'Nenhum membro' : `${members.length} membro${members.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {members.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              Nenhum membro convidado ainda
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`p-2 rounded-xl ${m.status === 'active' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    {m.status === 'active'
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <Clock size={16} className="text-yellow-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.member_email}</p>
                    <p className={`text-xs ${m.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {m.status === 'active' ? 'Ativo' : 'Aguardando cadastro'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
