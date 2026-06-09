'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Download, Trash2, Upload } from 'lucide-react'

type Documento = {
  id: string
  tipo: string
  arquivo_url: string
  arquivo_path: string
  arquivo_nome: string
  tamanho: number | null
  created_at: string
}

const TIPOS = [
  { value: 'art',      label: 'ART / RRT',  icon: '📋' },
  { value: 'seguro',   label: 'Seguro',      icon: '🛡️' },
  { value: 'contrato', label: 'Contrato',    icon: '📝' },
  { value: 'planta',   label: 'Planta',      icon: '📐' },
  { value: 'outro',    label: 'Outro',       icon: '📄' },
]

function tipoIcon(tipo: string)  { return TIPOS.find(t => t.value === tipo)?.icon  || '📄' }
function tipoLabel(tipo: string) { return TIPOS.find(t => t.value === tipo)?.label || 'Outro' }

function fmtBytes(b: number) {
  if (b < 1024)            return `${b} B`
  if (b < 1024 * 1024)     return `${Math.round(b / 1024)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentosSection({
  obraId,
  isOwner,
}: {
  obraId: string
  isOwner: boolean
}) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [docs,      setDocs]      = useState<Documento[]>([])
  const [showForm,  setShowForm]  = useState(false)
  const [file,      setFile]      = useState<File | null>(null)
  const [tipo,      setTipo]      = useState('outro')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('documentos_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
    setDocs((data as Documento[]) || [])
  }, [obraId, supabase])

  useEffect(() => { load() }, [load])

  async function handleUpload() {
    if (!file) return
    setUploading(true)

    const ext  = file.name.split('.').pop() || 'bin'
    const path = `${obraId}/${Date.now()}.${ext}`

    const { error: storErr } = await supabase.storage
      .from('documentos')
      .upload(path, file, { upsert: false })

    if (storErr) {
      alert('Erro ao enviar arquivo: ' + storErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documentos')
      .getPublicUrl(path)

    const { data, error } = await supabase
      .from('documentos_obra')
      .insert({
        obra_id:      obraId,
        tipo,
        arquivo_url:  publicUrl,
        arquivo_path: path,
        arquivo_nome: file.name,
        tamanho:      file.size,
      })
      .select()
      .single()

    if (!error && data) {
      setDocs(prev => [data as Documento, ...prev])
      setFile(null)
      setTipo('outro')
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
    }
    setUploading(false)
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`Remover "${doc.arquivo_nome}"?`)) return
    await supabase.storage.from('documentos').remove([doc.arquivo_path])
    await supabase.from('documentos_obra').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Documentos</h2>
          {docs.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {docs.length} arquivo{docs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="w-8 h-8 flex items-center justify-center text-orange-500 hover:bg-orange-50 rounded-xl transition"
            title="Adicionar documento"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-50 space-y-3">

          {/* Tipo */}
          <div className="flex gap-1.5 flex-wrap">
            {TIPOS.map(t => (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border font-medium transition ${
                  tipo === t.value
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
              file
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.dwg"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <p className="text-sm font-semibold text-orange-700 truncate">{file.name}</p>
                <p className="text-xs text-orange-400 mt-0.5">{fmtBytes(file.size)}</p>
              </>
            ) : (
              <>
                <Upload size={22} className="mx-auto mb-1.5 text-gray-300" />
                <p className="text-sm text-gray-400">Toque para selecionar o arquivo</p>
                <p className="text-xs text-gray-300 mt-0.5">PDF, imagem, Word, Excel</p>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition"
            >
              {uploading ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          </div>
        </div>
      )}

      {/* Empty */}
      {docs.length === 0 && !showForm && (
        <div className="px-4 pb-4 text-center">
          <p className="text-sm text-gray-400">
            {isOwner
              ? 'Adicione ART, seguro, contrato… clicando em +'
              : 'Nenhum documento'}
          </p>
        </div>
      )}

      {/* List */}
      {docs.length > 0 && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl shrink-0">{tipoIcon(doc.tipo)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.arquivo_nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tipoLabel(doc.tipo)}
                  {doc.tamanho ? ` · ${fmtBytes(doc.tamanho)}` : ''}
                </p>
              </div>
              <a
                href={doc.arquivo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition"
                title="Abrir / baixar"
              >
                <Download size={16} />
              </a>
              {isOwner && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="shrink-0 text-gray-200 hover:text-red-400 transition p-1"
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
