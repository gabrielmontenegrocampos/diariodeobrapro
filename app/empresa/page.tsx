'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { maskCPF, maskCNPJ, maskCEP, maskPhone, buscarCEP, buscarCNPJ } from '@/lib/masks'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function EmpresaPage() {
  const supabase = createClient()
  const router = useRouter()

  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [tipo, setTipo] = useState<'juridica' | 'fisica'>('juridica')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [celular, setCelular] = useState('')
  const [cep, setCep] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('empresas').select('*').eq('user_id', session.user.id).maybeSingle()
      if (data) {
        setTipo(data.tipo || 'juridica')
        setCpfCnpj(data.cpf_cnpj || '')
        setRazaoSocial(data.razao_social || '')
        setNomeFantasia(data.nome_fantasia || '')
        setEmail(data.email || '')
        setTelefone(data.telefone || '')
        setCelular(data.celular || '')
        setCep(data.cep || '')
        setLogradouro(data.logradouro || '')
        setNumero(data.numero || '')
        setComplemento(data.complemento || '')
        setBairro(data.bairro || '')
        setCidade(data.cidade || '')
        setEstado(data.estado || '')
      }
      setFetching(false)
    }
    load()
  }, [])

  async function handleBuscarCNPJ() {
    setBuscandoCNPJ(true)
    const dados = await buscarCNPJ(cpfCnpj)
    if (dados) {
      if (dados.razao_social) setRazaoSocial(dados.razao_social)
      if (dados.nome_fantasia) setNomeFantasia(dados.nome_fantasia)
      if (dados.email) setEmail(dados.email)
      if (dados.telefone) setTelefone(maskPhone(dados.telefone))
      if (dados.cep) setCep(maskCEP(dados.cep))
      if (dados.logradouro) setLogradouro(dados.logradouro)
      if (dados.numero) setNumero(dados.numero)
      if (dados.complemento) setComplemento(dados.complemento)
      if (dados.bairro) setBairro(dados.bairro)
      if (dados.cidade) setCidade(dados.cidade)
      if (dados.estado) setEstado(dados.estado)
    } else {
      setError('CNPJ não encontrado. Verifique o número.')
    }
    setBuscandoCNPJ(false)
  }

  async function handleBuscarCEP() {
    setBuscandoCEP(true)
    const dados = await buscarCEP(cep)
    if (dados) {
      setLogradouro(dados.logradouro)
      setBairro(dados.bairro)
      setCidade(dados.cidade)
      setEstado(dados.estado)
    } else {
      setError('CEP não encontrado.')
    }
    setBuscandoCEP(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const payload = {
        user_id: session.user.id,
        tipo, cpf_cnpj: cpfCnpj, razao_social: razaoSocial,
        nome_fantasia: nomeFantasia || null, email: email || null,
        telefone: telefone || null, celular: celular || null,
        cep: cep || null, logradouro: logradouro || null,
        numero: numero || null, complemento: complemento || null,
        bairro: bairro || null, cidade: cidade || null, estado: estado || null,
      }

      const { error } = await supabase.from('empresas').upsert(payload, { onConflict: 'user_id' })
      if (error) throw new Error(error.message)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
  const labelCls = "block text-xs font-medium text-gray-500 mb-1"

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/obras" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Dados da Empresa</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Tipo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Tipo de pessoa</p>
          <div className="flex gap-2">
            {[{ v: 'juridica', l: 'Pessoa Jurídica (CNPJ)' }, { v: 'fisica', l: 'Pessoa Física (CPF)' }].map(opt => (
              <button key={opt.v} type="button" onClick={() => { setTipo(opt.v as any); setCpfCnpj('') }}
                className={`flex-1 py-2 rounded-xl text-sm border transition ${tipo === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 text-gray-700'}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {/* CNPJ/CPF */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className={labelCls}>{tipo === 'juridica' ? 'CNPJ *' : 'CPF *'}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cpfCnpj}
                onChange={e => setCpfCnpj(tipo === 'juridica' ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                placeholder={tipo === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                required
                className={inputCls}
              />
              {tipo === 'juridica' && (
                <button type="button" onClick={handleBuscarCNPJ} disabled={buscandoCNPJ}
                  className="px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center gap-1 text-sm disabled:opacity-60 shrink-0">
                  {buscandoCNPJ ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              )}
            </div>
            {tipo === 'juridica' && <p className="text-xs text-gray-400 mt-1">Clique na lupa para preencher automaticamente</p>}
          </div>

          <div>
            <label className={labelCls}>{tipo === 'juridica' ? 'Razão Social *' : 'Nome Completo *'}</label>
            <input type="text" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} required className={inputCls} />
          </div>

          {tipo === 'juridica' && (
            <div>
              <label className={labelCls}>Nome Fantasia</label>
              <input type="text" value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} className={inputCls} />
            </div>
          )}
        </div>

        {/* Contato */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contato</p>
          <div>
            <label className={labelCls}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@empresa.com.br" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Telefone</label>
              <input type="text" value={telefone} onChange={e => setTelefone(maskPhone(e.target.value))} placeholder="(00) 0000-0000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Celular / WhatsApp</label>
              <input type="text" value={celular} onChange={e => setCelular(maskPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Endereço</p>
          <div>
            <label className={labelCls}>CEP</label>
            <div className="flex gap-2">
              <input type="text" value={cep} onChange={e => setCep(maskCEP(e.target.value))} placeholder="00000-000" className={inputCls} />
              <button type="button" onClick={handleBuscarCEP} disabled={buscandoCEP}
                className="px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center gap-1 text-sm disabled:opacity-60 shrink-0">
                {buscandoCEP ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Logradouro</label>
            <input type="text" value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Rua, Avenida..." className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Número</label>
              <input type="text" value={numero} onChange={e => setNumero(e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Complemento</label>
              <input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Sala, andar..." className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Bairro</label>
            <input type="text" value={bairro} onChange={e => setBairro(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className={labelCls}>Cidade</label>
              <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} className={inputCls}>
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
        {success && <p className="text-green-600 text-sm px-1 font-medium">✓ Dados salvos com sucesso!</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3.5 transition disabled:opacity-60">
          {loading ? 'Salvando...' : 'Salvar Dados'}
        </button>
      </form>
    </div>
  )
}
