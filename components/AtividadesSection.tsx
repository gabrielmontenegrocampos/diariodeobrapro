'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

type Atividade = {
  id: string
  etapa: string
  descricao: string | null
  status: 'pendente' | 'em_andamento' | 'concluida'
  ordem: number
  parent_id: string | null
}

type Group = { parent: Atividade; children: Atividade[] }

const S = {
  pendente:     { label: 'Pendente',     cls: 'bg-gray-100 text-gray-500',     next: 'em_andamento' as const },
  em_andamento: { label: 'Em andamento', cls: 'bg-orange-100 text-orange-700',  next: 'concluida'    as const },
  concluida:    { label: 'Concluída ✓',  cls: 'bg-green-100 text-green-700',    next: 'pendente'     as const },
}

const sv  = (s: string) => s === 'concluida' ? 100 : s === 'em_andamento' ? 50 : 0
const clr = (p: number) => p < 30 ? '#ef4444' : p < 70 ? '#f97316' : '#22c55e'

function gProg(g: Group): number {
  if (!g.children.length) return sv(g.parent.status)
  return Math.round(g.children.reduce((a, c) => a + sv(c.status), 0) / g.children.length)
}
function totalProg(gs: Group[]): number {
  if (!gs.length) return 0
  return Math.round(gs.reduce((a, g) => a + gProg(g), 0) / gs.length)
}
function buildGroups(list: Atividade[]): Group[] {
  const parents = list.filter(a => !a.parent_id).sort((a, b) => a.ordem - b.ordem)
  return parents.map(p => ({
    parent: p,
    children: list.filter(a => a.parent_id === p.id).sort((a, b) => a.ordem - b.ordem),
  }))
}

export default function AtividadesSection({ obraId, isOwner }: { obraId: string; isOwner: boolean }) {
  const supabase = createClient()

  const [all,           setAll]           = useState<Atividade[]>([])
  const [showAddParent, setShowAddParent] = useState(false)
  const [addingSubTo,   setAddingSubTo]   = useState<string | null>(null)
  const [newEtapa,      setNewEtapa]      = useState('')
  const [newDesc,       setNewDesc]       = useState('')
  const [saving,        setSaving]        = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('atividades_obra').select('*').eq('obra_id', obraId)
      .order('ordem', { ascending: true }).order('created_at', { ascending: true })
    setAll((data as Atividade[]) || [])
  }, [obraId, supabase])

  useEffect(() => { load() }, [load])

  async function syncProgress(list: Atividade[]) {
    const p = totalProg(buildGroups(list))
    await supabase.from('obras').update({ progresso_atual: p }).eq('id', obraId)
  }

  async function updateStatus(id: string, cur: keyof typeof S) {
    const next = S[cur].next
    const updated = all.map(a => a.id === id ? { ...a, status: next } : a)
    setAll(updated)
    await supabase.from('atividades_obra').update({ status: next }).eq('id', id)
    await syncProgress(updated)
  }

  async function addActivity(parentId?: string) {
    if (!newEtapa.trim()) return
    setSaving(true)
    const siblings = parentId
      ? all.filter(a => a.parent_id === parentId)
      : all.filter(a => !a.parent_id)
    const { data, error } = await supabase
      .from('atividades_obra')
      .insert({
        obra_id:   obraId,
        etapa:     newEtapa.trim(),
        descricao: newDesc.trim() || null,
        status:    'pendente',
        ordem:     siblings.length,
        parent_id: parentId || null,
      })
      .select().single()
    if (!error && data) {
      const updated = [...all, data as Atividade]
      setAll(updated)
      await syncProgress(updated)
    }
    setNewEtapa('')
    setNewDesc('')
    setShowAddParent(false)
    setAddingSubTo(null)
    setSaving(false)
  }

  async function deleteActivity(id: string) {
    // DB cascade deletes children; filter both from local state
    const childIds = all.filter(a => a.parent_id === id).map(a => a.id)
    await supabase.from('atividades_obra').delete().eq('id', id)
    const updated = all.filter(a => a.id !== id && !childIds.includes(a.id))
    setAll(updated)
    await syncProgress(updated)
  }

  async function moveParent(idx: number, dir: -1 | 1) {
    const gs = buildGroups(all)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= gs.length) return
    // Swap positions then reassign ordems
    const reordered = [...gs]
    ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
    await Promise.all(
      reordered.map((g, i) =>
        supabase.from('atividades_obra').update({ ordem: i }).eq('id', g.parent.id)
      )
    )
    const idToOrdem = Object.fromEntries(reordered.map((g, i) => [g.parent.id, i]))
    setAll(prev => prev.map(a => (a.id in idToOrdem ? { ...a, ordem: idToOrdem[a.id] } : a)))
  }

  function openAddSub(parentId: string) {
    setAddingSubTo(parentId)
    setShowAddParent(false)
    setNewEtapa('')
    setNewDesc('')
  }
  function openAddParent() {
    setShowAddParent(v => !v)
    setAddingSubTo(null)
    setNewEtapa('')
    setNewDesc('')
  }
  function cancelForm() {
    setShowAddParent(false)
    setAddingSubTo(null)
    setNewEtapa('')
    setNewDesc('')
  }

  function InlineForm({ parentId }: { parentId?: string }) {
    return (
      <div className="space-y-2 pt-2 pb-1">
        <input
          type="text" value={newEtapa} onChange={e => setNewEtapa(e.target.value)}
          placeholder={parentId ? 'Nome da sub-atividade *' : 'Nome da atividade *'}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addActivity(parentId)}
          autoFocus
        />
        <input
          type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
          placeholder="Descrição (opcional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <div className="flex gap-2">
          <button onClick={cancelForm}
            className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium">
            Cancelar
          </button>
          <button onClick={() => addActivity(parentId)} disabled={saving || !newEtapa.trim()}
            className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
            {saving ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </div>
    )
  }

  const groups = buildGroups(all)
  const prog   = totalProg(groups)
  const done   = groups.filter(g => gProg(g) === 100).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Atividades da Obra</h2>
          {groups.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {done}/{groups.length} etapa{groups.length !== 1 ? 's' : ''} concluída{groups.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isOwner && (
          <button onClick={openAddParent}
            className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-50 rounded-xl transition"
            title="Nova atividade">
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Overall progress bar */}
      {groups.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Avanço físico total</span>
            <span className="text-sm font-bold" style={{ color: clr(prog) }}>{prog}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${prog}%`, backgroundColor: clr(prog) }} />
          </div>
        </div>
      )}

      {/* Add parent form */}
      {showAddParent && isOwner && (
        <div className="px-4 pb-3 border-t border-gray-50">
          <InlineForm />
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && !showAddParent && (
        <div className="px-4 pb-4 text-center">
          <p className="text-sm text-gray-400">
            {isOwner ? 'Cadastre as etapas do contrato clicando em +' : 'Nenhuma atividade cadastrada'}
          </p>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="border-t border-gray-50">
          {groups.map((g, gi) => {
            const gp          = gProg(g)
            const hasChildren = g.children.length > 0
            const isAddingSub = addingSubTo === g.parent.id

            return (
              <div key={g.parent.id} className="border-b border-gray-50 last:border-b-0">

                {/* ── Parent row ── */}
                <div className="flex items-center gap-2 px-4 py-3">

                  {/* ↑↓ reorder */}
                  {isOwner && (
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => moveParent(gi, -1)} disabled={gi === 0}
                        className="p-0.5 text-gray-200 hover:text-gray-500 disabled:opacity-20 transition">
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveParent(gi, 1)} disabled={gi === groups.length - 1}
                        className="p-0.5 text-gray-200 hover:text-gray-500 disabled:opacity-20 transition">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}

                  {/* Index */}
                  <span className="text-xs text-gray-300 font-mono w-4 text-right shrink-0">{gi + 1}</span>

                  {/* Name + mini bar (if has children) */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${gp === 100 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {g.parent.etapa}
                    </p>
                    {g.parent.descricao && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{g.parent.descricao}</p>
                    )}
                    {hasChildren && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${gp}%`, backgroundColor: clr(gp) }} />
                        </div>
                        <span className="text-xs font-bold shrink-0" style={{ color: clr(gp) }}>{gp}%</span>
                      </div>
                    )}
                  </div>

                  {/* Status (only when no children) */}
                  {!hasChildren && (
                    <button onClick={() => updateStatus(g.parent.id, g.parent.status)}
                      className={`shrink-0 text-xs px-2.5 py-1.5 rounded-xl font-semibold transition active:scale-95 ${S[g.parent.status].cls}`}>
                      {S[g.parent.status].label}
                    </button>
                  )}

                  {/* + sub-activity */}
                  {isOwner && (
                    <button onClick={() => isAddingSub ? cancelForm() : openAddSub(g.parent.id)}
                      className="shrink-0 p-1.5 text-gray-300 hover:text-orange-400 hover:bg-orange-50 rounded-lg transition"
                      title="Adicionar sub-atividade">
                      <Plus size={13} />
                    </button>
                  )}

                  {/* Delete parent */}
                  {isOwner && (
                    <button onClick={() => deleteActivity(g.parent.id)}
                      className="shrink-0 text-gray-200 hover:text-red-400 transition p-1">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* ── Sub-activities ── */}
                {g.children.map(child => (
                  <div key={child.id}
                    className="flex items-center gap-2 pl-12 pr-4 py-2.5 bg-gray-50/60 border-t border-gray-50">
                    <span className="text-xs text-gray-300 shrink-0 select-none">└</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${child.status === 'concluida' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {child.etapa}
                      </p>
                      {child.descricao && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{child.descricao}</p>
                      )}
                    </div>
                    <button onClick={() => updateStatus(child.id, child.status)}
                      className={`shrink-0 text-xs px-2 py-1 rounded-lg font-semibold transition active:scale-95 ${S[child.status].cls}`}>
                      {S[child.status].label}
                    </button>
                    {isOwner && (
                      <button onClick={() => deleteActivity(child.id)}
                        className="shrink-0 text-gray-200 hover:text-red-400 transition p-1">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}

                {/* ── Add sub form ── */}
                {isAddingSub && isOwner && (
                  <div className="pl-12 pr-4 pb-3 pt-1 bg-gray-50/60 border-t border-gray-50">
                    <InlineForm parentId={g.parent.id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
