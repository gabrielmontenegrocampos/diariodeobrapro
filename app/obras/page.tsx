import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Plus, MapPin, Calendar, LogOut } from 'lucide-react'
import type { Obra } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusLabel = { ativa: 'Ativa', pausada: 'Pausada', concluida: 'Concluída' }
const statusColor = {
  ativa: 'bg-green-100 text-green-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-gray-100 text-gray-600',
}

async function signOut() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function ObrasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obras } = await supabase
    .from('obras')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Obras</h1>
        <form action={signOut}>
          <button type="submit" className="p-2 text-gray-400 hover:text-gray-600">
            <LogOut size={20} />
          </button>
        </form>
      </div>

      {(!obras || obras.length === 0) ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Nenhuma obra ainda</p>
          <p className="text-sm">Crie sua primeira obra abaixo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obras.map((obra: Obra) => (
            <Link key={obra.id} href={`/obras/${obra.id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900 text-base leading-tight">{obra.nome}</h2>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusColor[obra.status]}`}>
                    {statusLabel[obra.status]}
                  </span>
                </div>
                {obra.endereco && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {obra.endereco}
                  </p>
                )}
                {obra.data_inicio && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    Início: {format(parseISO(obra.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href="/obras/nova">
        <button className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition">
          <Plus size={22} />
          <span className="font-semibold pr-1">Nova Obra</span>
        </button>
      </Link>
    </div>
  )
}
