import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ── Hotmart payload types ────────────────────────────────────────────
interface HotmartPayload {
  event: string
  id?: string
  data: {
    buyer: {
      email: string
      name: string
      first_name?: string
      last_name?: string
      checkout_phone?: string
    }
    purchase: {
      transaction: string
      status: string
      approved_date?: number
      offer?: { code?: string }
      subscription?: {
        status?: string
        subscriber?: { code?: string }
        plan?: { name?: string; id?: number }
      }
    }
    product?: {
      id?: number
      name?: string
    }
  }
}

// ── Events that mean "subscription/purchase is now active" ───────────
const APPROVED_EVENTS = new Set([
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
])

// ── Events that mean "access should be revoked" ──────────────────────
const CANCELLED_EVENTS = new Set([
  'PURCHASE_CANCELED',
  'PURCHASE_CANCELLED',     // both spellings
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'SUBSCRIPTION_CANCELLATION',
  'PURCHASE_PROTEST',
])

export async function POST(req: NextRequest) {
  // ── 1. Verify Hotmart token ────────────────────────────────────────
  // Configure HOTMART_HOTTOK in Vercel env vars.
  // In Hotmart: Produtos → seu produto → Webhooks → Token de segurança
  const expected = process.env.HOTMART_HOTTOK
  if (!expected) {
    console.error('[hotmart] HOTMART_HOTTOK env var not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const received =
    req.headers.get('x-hotmart-hottok') ??
    req.headers.get('x-hotmart-webhook-token') ??
    new URL(req.url).searchParams.get('hottok')

  if (received !== expected) {
    console.warn('[hotmart] Invalid token received:', received)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse body ─────────────────────────────────────────────────
  let body: HotmartPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, data } = body
  console.log('[hotmart] event:', event, '| email:', data?.buyer?.email)

  // Always return 200 so Hotmart doesn't keep retrying unhandled events
  if (!APPROVED_EVENTS.has(event) && !CANCELLED_EVENTS.has(event)) {
    return NextResponse.json({ ok: true, handled: false })
  }

  // ── 3. Extract fields ─────────────────────────────────────────────
  const email       = data.buyer.email?.trim().toLowerCase()
  const nome        = data.buyer.name || data.buyer.first_name || email
  const transaction = data.purchase.transaction
  const plano       = data.purchase.subscription?.plan?.name ??
                      data.product?.name ??
                      'Diário de Obra Pro'
  const subscriberCode = data.purchase.subscription?.subscriber?.code

  if (!email || !transaction) {
    console.error('[hotmart] Missing email or transaction in payload')
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    if (APPROVED_EVENTS.has(event)) {
      await handleApproved({ service, email, nome, transaction, subscriberCode, plano, raw: body })
    } else {
      await handleCancelled({ service, email, transaction, raw: body })
    }
  } catch (err: any) {
    console.error('[hotmart] Handler error:', err.message)
    // Still return 200 — log the error but don't trigger Hotmart retries
    return NextResponse.json({ ok: false, error: err.message })
  }

  return NextResponse.json({ ok: true, event })
}

// ── PURCHASE_APPROVED ────────────────────────────────────────────────
async function handleApproved({
  service, email, nome, transaction, subscriberCode, plano, raw,
}: {
  service: ReturnType<typeof createServiceClient>
  email: string
  nome: string
  transaction: string
  subscriberCode?: string
  plano: string
  raw: unknown
}) {
  // Check if this exact transaction was already processed
  const { data: dup } = await service
    .from('subscriptions')
    .select('id, user_id')
    .eq('hotmart_transaction', transaction)
    .maybeSingle()

  if (dup) {
    // Transaction exists → just make sure status is 'ativa' (could be a re-approval)
    await service
      .from('subscriptions')
      .update({ status: 'ativa', updated_at: new Date().toISOString() })
      .eq('id', dup.id)
    console.log('[hotmart] Re-approved existing transaction:', transaction)
    return
  }

  // ── Find or create Supabase user ─────────────────────────────────
  let userId: string | null = null

  // 1. Look for existing subscription with this email (user already has account)
  const { data: existing } = await service
    .from('subscriptions')
    .select('user_id')
    .ilike('email', email)
    .not('user_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (existing?.user_id) {
    userId = existing.user_id
    console.log('[hotmart] Found existing user for email:', email)
  } else {
    // 2. Invite user — creates account + sends "you've been invited" email
    //    User clicks the email link and sets their own password.
    //    Customise this email in: Supabase → Authentication → Email Templates → Invite user
    const { data: invite, error: inviteErr } = await service.auth.admin.inviteUserByEmail(
      email,
      { data: { name: nome } }
    )

    if (!inviteErr && invite?.user?.id) {
      userId = invite.user.id
      // Create profile row
      await service.from('profiles').upsert(
        { id: userId, nome },
        { onConflict: 'id' }
      )
      console.log('[hotmart] Invited new user:', email, '→ id:', userId)
    } else {
      // inviteUserByEmail can fail if user exists but wasn't in subscriptions yet
      console.warn('[hotmart] Invite failed (user may already exist):', inviteErr?.message)
      // Subscription will be saved without user_id; manual linking possible later
    }
  }

  // ── Save subscription record ──────────────────────────────────────
  const { error: insertErr } = await service.from('subscriptions').insert({
    email,
    user_id: userId,
    nome,
    hotmart_transaction: transaction,
    hotmart_subscriber_code: subscriberCode ?? null,
    plano,
    status: 'ativa',
    raw_payload: raw,
  })

  if (insertErr) {
    throw new Error('subscriptions insert failed: ' + insertErr.message)
  }

  console.log('[hotmart] Subscription created for:', email)
}

// ── PURCHASE_CANCELED / REFUNDED / etc. ──────────────────────────────
async function handleCancelled({
  service, email, transaction, raw,
}: {
  service: ReturnType<typeof createServiceClient>
  email: string
  transaction: string
  raw: unknown
}) {
  // Update by transaction (most specific)
  const { error } = await service
    .from('subscriptions')
    .update({
      status: 'cancelada',
      raw_payload: raw,
      updated_at: new Date().toISOString(),
    })
    .eq('hotmart_transaction', transaction)

  if (error) {
    throw new Error('subscriptions update failed: ' + error.message)
  }

  console.log('[hotmart] Subscription cancelled for:', email, '| tx:', transaction)
}
