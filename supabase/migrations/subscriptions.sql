-- ── Tabela de assinaturas (Hotmart webhook) ──────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email                   TEXT        NOT NULL,
  nome                    TEXT,
  hotmart_transaction     TEXT        UNIQUE,   -- ID único de cada compra
  hotmart_subscriber_code TEXT,                 -- código do assinante (planos recorrentes)
  plano                   TEXT,                 -- ex: "Plano Mensal", "Plano Anual"
  status                  TEXT        NOT NULL DEFAULT 'ativa'
                            CHECK (status IN ('ativa','cancelada','reembolsada','expirada')),
  raw_payload             JSONB,                -- payload completo do webhook (para debug)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_email       ON subscriptions (email);
CREATE INDEX IF NOT EXISTS idx_sub_user_id     ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_sub_transaction ON subscriptions (hotmart_transaction);

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas a própria assinatura
CREATE POLICY "sub_select_own" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Service role (webhook) tem acesso total
CREATE POLICY "sub_service_all" ON subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
