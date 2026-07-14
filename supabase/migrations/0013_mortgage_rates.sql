-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0013_mortgage_rates.sql
-- Page 14 — Mortgage Rates Hub (MVP): /mortgage/rates.
--
-- Adds:
--   • `partner_banks`     — public read-only reference data (bank directory).
--   • `mortgage_rates`    — public read-only reference data (manually
--                           maintained rate sheet, see docs/en/pages/
--                           14-mortgage-rates.md §0 "Data source").
--   • `preapproval_leads` — "Get pre-approved" lead form submissions.
--
-- RLS shapes reused, not reinvented (docs/design/14-mortgage-rates-handoff.md
-- D9): `partner_banks`/`mortgage_rates` mirror 0009_plans.sql's public-
-- SELECT/service-role-write reference-data pattern; `preapproval_leads`
-- mirrors 0008_agent_profile.sql's `agent_leads` owner-write lead table,
-- plus 0012_admin_moderation.sql's existing `is_admin()` helper for the
-- admin-read half (not redefined here).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_banks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  logo        TEXT,
  country     TEXT[]      NOT NULL DEFAULT '{}',  -- ISO 3166-1 alpha-2, e.g. {'AM'}
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mortgage_rates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id        UUID        NOT NULL REFERENCES partner_banks(id) ON DELETE CASCADE,
  country        TEXT        NOT NULL CHECK (char_length(country) = 2),
  currency       TEXT        NOT NULL CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  loan_type      TEXT        NOT NULL
                                CHECK (loan_type IN ('primary', 'secondary', 'new_construction', 'refinance', 'government')),
  rate_pct       NUMERIC(5,2) NOT NULL CHECK (rate_pct >= 0),
  term_min       SMALLINT    NOT NULL CHECK (term_min > 0),
  term_max       SMALLINT    NOT NULL CHECK (term_max >= term_min),
  min_down_pct   NUMERIC(5,2) CHECK (min_down_pct IS NULL OR (min_down_pct >= 0 AND min_down_pct <= 100)),
  max_ltv        NUMERIC(5,2) CHECK (max_ltv IS NULL OR (max_ltv >= 0 AND max_ltv <= 100)),
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Free-text provenance note, e.g. 'manual entry' / 'bank rate sheet 2026-06'.
  source         TEXT
);

CREATE INDEX IF NOT EXISTS mortgage_rates_filter_idx
  ON mortgage_rates (country, currency, loan_type, rate_pct);

CREATE TABLE IF NOT EXISTS preapproval_leads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  loan_amount NUMERIC     NOT NULL CHECK (loan_amount > 0),
  country     TEXT        CHECK (country IS NULL OR char_length(country) = 2),
  currency    TEXT        CHECK (currency IS NULL OR currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  consent     BOOLEAN     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS preapproval_leads_user_id_created_idx
  ON preapproval_leads (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE partner_banks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE preapproval_leads ENABLE ROW LEVEL SECURITY;

-- Public read-only reference data (D9) — no write policy, so RLS default-denies
-- writes for anon/authenticated; only the service-role key can write (rates are
-- manually maintained, no admin UI ships in this task).
CREATE POLICY "partner_banks: public can select"
  ON partner_banks FOR SELECT USING (is_active = true);

CREATE POLICY "mortgage_rates: public can select"
  ON mortgage_rates FOR SELECT USING (true);

-- preapproval_leads: owner or admin can read (reuses is_admin() from
-- 0012_admin_moderation.sql — not redefined here); owner-only, authenticated
-- insert (matches agent_leads' shape in 0008_agent_profile.sql).
CREATE POLICY "preapproval_leads: owner or admin can select"
  ON preapproval_leads FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "preapproval_leads: user can insert own"
  ON preapproval_leads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed — at least 2 countries so the page isn't empty in review (task
-- acceptance criterion). Realistic sample banks/rates, manually curated
-- display data — not a claim of an actual partnership.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO partner_banks (slug, name, logo, country, description, is_active) VALUES
  ('ardshinbank', 'Ardshinbank', '/images/banks/ardshinbank.svg', '{AM}', 'Leading Armenian retail bank.', true),
  ('ameriabank',  'Ameriabank',  '/images/banks/ameriabank.svg',  '{AM}', 'Universal bank offering mortgage programs.', true),
  ('inecobank',   'Inecobank',   '/images/banks/inecobank.svg',   '{AM}', 'Retail and SME bank with government mortgage programs.', true),
  ('sberbank-ru', 'Sberbank',    '/images/banks/sberbank.svg',    '{RU}', 'Russia''s largest retail bank.', true),
  ('vtb-ru',      'VTB',         '/images/banks/vtb.svg',         '{RU}', 'Major Russian universal bank.', true)
ON CONFLICT (slug) DO NOTHING;

-- One row per bank/loan-type combination — enough to exercise sort + filters
-- + the stale badge (two rows deliberately dated > 30 days back). Guarded by
-- "table currently empty" (mortgage_rates has no natural unique key to hang
-- an ON CONFLICT off of) so re-running this migration doesn't duplicate rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mortgage_rates) THEN
    INSERT INTO mortgage_rates (bank_id, country, currency, loan_type, rate_pct, term_min, term_max, min_down_pct, max_ltv, commission_pct, updated_at, source)
    SELECT id, 'AM', 'AMD', 'primary',          11.9, 15, 20, 20, 80, 1.0, NOW(),                    'manual entry' FROM partner_banks WHERE slug = 'ardshinbank'
    UNION ALL
    SELECT id, 'AM', 'AMD', 'secondary',        12.5, 10, 20, 20, 80, 1.0, NOW() - INTERVAL '10 days', 'manual entry' FROM partner_banks WHERE slug = 'ardshinbank'
    UNION ALL
    SELECT id, 'AM', 'AMD', 'secondary',        12.4, 10, 20, 15, 85, 1.5, NOW() - INTERVAL '45 days', 'manual entry' FROM partner_banks WHERE slug = 'ameriabank'
    UNION ALL
    SELECT id, 'AM', 'USD', 'primary',           9.8, 10, 15, 20, 80, 1.0, NOW() - INTERVAL '2 days',  'manual entry' FROM partner_banks WHERE slug = 'ameriabank'
    UNION ALL
    SELECT id, 'AM', 'AMD', 'government',       10.5, 10, 20, 10, 90, 0.5, NOW() - INTERVAL '1 days',  'manual entry' FROM partner_banks WHERE slug = 'inecobank'
    UNION ALL
    SELECT id, 'AM', 'AMD', 'new_construction', 12.0, 10, 25, 15, 85, 1.0, NOW() - INTERVAL '5 days',  'manual entry' FROM partner_banks WHERE slug = 'inecobank'
    UNION ALL
    SELECT id, 'RU', 'RUB', 'primary',          16.5, 15, 30, 20, 80, 0.5, NOW(),                    'manual entry' FROM partner_banks WHERE slug = 'sberbank-ru'
    UNION ALL
    SELECT id, 'RU', 'RUB', 'refinance',        17.0, 10, 25, 20, 80, 0.5, NOW() - INTERVAL '35 days', 'manual entry' FROM partner_banks WHERE slug = 'sberbank-ru'
    UNION ALL
    SELECT id, 'RU', 'RUB', 'primary',          15.9, 15, 30, 15, 85, 0.7, NOW() - INTERVAL '3 days',  'manual entry' FROM partner_banks WHERE slug = 'vtb-ru'
    UNION ALL
    SELECT id, 'RU', 'USD', 'secondary',        10.2, 10, 20, 25, 75, 1.2, NOW() - INTERVAL '7 days',  'manual entry' FROM partner_banks WHERE slug = 'vtb-ru';
  END IF;
END $$;
