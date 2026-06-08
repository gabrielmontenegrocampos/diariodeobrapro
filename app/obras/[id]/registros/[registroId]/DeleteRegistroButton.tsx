'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function DeleteRegistroButton({ registroId, obraId }: { registroId: string; obraId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    await supabase.from('registros').delete().eq('id', registroId)
    router.push(`/obras/${obraId}`)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-red-500 hover:border-red-300 transition disabled:opacity-60"
    >
      <Trash2 size={16} />
    </button>
  )
}
