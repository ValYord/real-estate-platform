-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0009_plans.sql
-- Page 17 — Pricing (/pro), MVP.
--
-- Adds the `plans` table: public read-only reference data backing the tier
-- comparison table on /pro (Free / Pro / Premium). No write API ships in this
-- task — a future admin UI (Page 24) is the intended writer, using the
-- service-role client (lib/supabase/admin.ts), which bypasses RLS entirely.
-- Seeded here (not in supabase/seed.sql) because this is reference/config
-- data needed in every environment (staging/prod included), not local-dev
-- demo data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tier        TEXT        NOT NULL UNIQUE CHECK (tier IN ('free', 'pro', 'premium')),
  is_popular  BOOLEAN     NOT NULL DEFAULT false,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  -- One static price per currency, no live FX conversion, e.g.:
  -- { "AMD": {"monthly":9900,"annual":95040}, "USD": {...}, "EUR": {...}, "RUB": {...} }
  prices      JSONB       NOT NULL DEFAULT '{}',
  -- Shape mirrors lib/plans/types.ts PlanFeatures — see that file for field docs.
  features    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plans_sort_order_idx ON plans (sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — public SELECT only. No INSERT/UPDATE/DELETE policy is created, so RLS
-- default-denies all writes for the anon/authenticated roles; only the
-- service-role key (which bypasses RLS) can write. That satisfies "write
-- restricted to service role/admin" without needing a role-check policy.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans: public can select"
  ON plans
  FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data — matches lib/plans/defaultPlans.ts (the Supabase-unconfigured
-- fallback used by app/[locale]/pro/page.tsx) exactly. Keep both in sync if
-- prices/features change.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO plans (tier, is_popular, sort_order, prices, features)
VALUES
  (
    'free', false, 0,
    '{"AMD":{"monthly":0,"annual":0},"USD":{"monthly":0,"annual":0},"EUR":{"monthly":0,"annual":0},"RUB":{"monthly":0,"annual":0}}',
    '{"listings":3,"featuredPerMonth":0,"analytics":"basic","proBadge":false,"rankingPriority":"none","leadInbox":"none","bulkUpload":false,"teamSeats":0,"support":"community","placementGuarantee":false}'
  ),
  (
    'pro', false, 1,
    '{"AMD":{"monthly":9900,"annual":95040},"USD":{"monthly":25,"annual":240},"EUR":{"monthly":23,"annual":221},"RUB":{"monthly":2400,"annual":23040}}',
    '{"listings":25,"featuredPerMonth":2,"analytics":"extended","proBadge":true,"rankingPriority":"medium","leadInbox":"standard","bulkUpload":false,"teamSeats":1,"support":"email","placementGuarantee":false}'
  ),
  (
    'premium', true, 2,
    '{"AMD":{"monthly":24900,"annual":239040},"USD":{"monthly":65,"annual":624},"EUR":{"monthly":60,"annual":576},"RUB":{"monthly":6100,"annual":58560}}',
    '{"listings":null,"featuredPerMonth":10,"analytics":"full","proBadge":true,"rankingPriority":"high","leadInbox":"priority","bulkUpload":true,"teamSeats":10,"support":"email_phone","placementGuarantee":true}'
  )
ON CONFLICT (tier) DO NOTHING;
