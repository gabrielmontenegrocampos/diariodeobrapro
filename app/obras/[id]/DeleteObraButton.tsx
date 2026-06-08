'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function DeleteObraButton({ obraId }: { obraId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!confirm('Excluir esta obra e todos os seus registros? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    await supabase.from('obras').delete().eq('id', obraId)
    router.push('/obras')
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
