import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Verifica autenticação do dono
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { email, password, nome } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })

    // Cria o usuário via admin (sem precisar de confirmação de email)
    const service = createServiceClient()
    const { data, error } = await service.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: nome || email },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json({ error: 'Este e-mail já tem uma conta.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Adiciona na equipe e ativa imediatamente
    const userId = data.user.id
    const emailLower = email.trim().toLowerCase()

    // Insere ou atualiza em team_members
    await service.from('team_members').upsert({
      owner_id: session.user.id,
      member_email: emailLower,
      member_id: userId,
      status: 'active',
    }, { onConflict: 'owner_id,member_email' })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
