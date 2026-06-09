'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'

type Atividade = {
  id: string
  etapa: string
  descricao: string | null
  status: 'pendente' | 'em_andamento' | 'concluida'
  ordem: number
}

const STATUS_CFG = {
  pendente: {
    label: 'Pendente',
    cls: 'bg-gray-100 text-gray-500',
    next: 'em_andamento' as const,
  },
  em_andamento: {
    label: 'Em andamento',
    cls: 'bg-orange-100 text-orange-700',
    next: 'concluida' as const,
  },
  concluida: {
    label: 'Concluída ✓',
    cls: 'bg-green-100 text-green-700',
    next: 'pendente' as const,
  },
}

function calcProgress(list: Atividade[]) {
  if (list.length === 0) return 0
  const score = list.reduce((acc, a) => acc + (a.status === 'concluida' ? 100 : a.status === 'em_andamento' ? 50 : 0), 0)
  return Math.round(score / list.length)
}

export default function AtividadesSection({ obraId, isOwner }: { obraId: string; isOwner: boolean }) {
  const supabase = createClient()
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [showForm, setShowForm] = useState(false)
  const [novaEtapa, setNovaEtapa] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('atividades_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: true })
    setAtividades((data as Atividade[]) || [])
  }, [obraId, supabase])

  useEffect(() => { load() }, [load])

  async function syncProgress(list: Atividade[]) {
    const prog = calcProgress(list)
    await supabase.from('obras').update({ progresso_atual: prog }).eq('id', obraId)
  }

  async function updateStatus(id: string, cur: keyof typeof STATUS_CFG) {
    const next = STATUS_CFG[cur].next
    const updated = atividades.map(a => a.id === id ? { ...a, status: next } : a)
    setAtividades(updated)
    await supabase.from('atividades_obra').update({ status: next }).eq('id', id)
    await syncProgress(updated)
  }

  async function addAtividade() {
    if (!novaEtapa.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('atividades_obra')
      .insert({
        obra_id: obraId,
        etapa: novaEtapa.trim(),
        descricao: novaDesc.trim() || null,
        ordem: atividades.length,
        status: 'pendente',
      })
      .select()
      .single()
    if (!error && data) {
      const updated = [...atividades, data as Atividade]
      setAtividades(updated)
      await syncProgress(updated)
      setNovaEtapa('')
      setNovaDesc('')
      setShowForm(false)
    }
    setSaving(false)
  }

  async function deleteAtividade(id: string) {
    await supabase.from('atividades_obra').delete().eq('id', id)
    const updated = atividades.filter(a => a.id !== id)
    setAtividades(updated)
    await syncProgress(updated)
  }

  const progresso = calcProgress(atividades)
  const concluidas = atividades.filter(a => a.status === 'concluida').length
  const emAndamento = atividades.filter(a => a.status === 'em_andamento').length
  const pendentes = atividades.length - concluidas - emAndamento
  const progColor = progresso < 30 ? '#ef4444' : progresso < 70 ? '#f97316' : '#22c55e'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Atividades da Obra</h2>
          {atividades.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {[
                concluidas > 0 && `${concluidas} concluída${concluidas !== 1 ? 's' : ''}`,
                emAndamento > 0 && `${emAndamento} em andamento`,
                pendentes > 0 && `${pendentes} pendente${pendentes !== 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-50 rounded-xl transition"
            title="Adicionar atividade"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {atividades.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Avanço físico</span>
            <span className="text-sm font-bold" style={{ color: progColor }}>{progresso}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progresso}%`, backgroundColor: progColor }}
            />
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-50 space-y-2.5">
          <input
            type="text"
            value={novaEtapa}
            onChange={e => setNovaEtapa(e.target.value)}
            placeholder="Nome da etapa / atividade *"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addAtividade()}
            autoFocus
          />
          <input
            type="text"
            value={novaDesc}
            onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setNovaEtapa(''); setNovaDesc('') }}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={addAtividade}
              disabled={saving || !novaEtapa.trim()}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition"
            >
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {atividades.length === 0 && !showForm && (
        <div className="px-4 pb-4 text-center">
          <p className="text-sm text-gray-400">
            {isOwner
              ? 'Cadastre as etapas do contrato clicando em +'
              : 'Nenhuma atividade cadastrada'}
          </p>
        </div>
      )}

      {/* List */}
      {atividades.length > 0 && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {atividades.map((a, idx) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs text-gray-300 font-mono w-4 shrink-0 text-right select-none">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${a.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {a.etapa}
                </p>
                {a.descricao && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{a.descricao}</p>
                )}
              </div>
              <button
                onClick={() => updateStatus(a.id, a.status)}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl font-semibold transition-all active:scale-95 ${STATUS_CFG[a.status].cls}`}
                title="Clique para avançar o status"
              >
                {STATUS_CFG[a.status].label}
              </button>
              {isOwner && (
                <button
                  onClick={() => deleteAtividade(a.id)}
                  className="shrink-0 text-gray-200 hover:text-red-400 transition p-1"
                  title="Remover atividade"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
