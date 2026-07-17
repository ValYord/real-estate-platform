-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0015_landlord_screening_lease.sql
-- Page 19 — Landlord Tools: Screening + Lease Generation (MVP):
--   /landlord/screening, /landlord/lease, /apply/[token].
--
-- Adds:
--   • `rental_units.apply_token` — an unguessable bearer token per unit,
--     used to build the public "shareable application link"
--     (`/apply/[token]`, §3.3). Deliberately NOT the unit's primary key —
--     same rationale as `home_value_estimates.hash`
--     (0010_home_value_estimates.sql): a public capability token should be
--     a value dedicated to that purpose, not an internal id. `DEFAULT
--     encode(gen_random_bytes(12), 'hex')` is VOLATILE, so `ALTER TABLE
--     ... ADD COLUMN` backfills every existing row with its own random
--     token (not one shared value) in the same statement.
--   • `tenant_applications` — tenant screening submissions (§3.3). Public
--     INSERT happens through the service-role client only (see
--     app/api/apply/[token]/route.ts) — anonymous applicants have no
--     Supabase session to satisfy an RLS `WITH CHECK`, so (mirroring
--     `home_value_estimates`'s pattern) there is no public INSERT policy;
--     the owner-scoped INSERT policy below exists only as defense in depth
--     for a landlord inserting a test row directly.
--   • `lease_templates` — per-country/lang/deal-type template bodies
--     (§3.4). Public read-only reference data, service-role-write only —
--     same shape as `partner_banks`/`mortgage_rates`
--     (0013_mortgage_rates.sql). Seeded with a single English long-term
--     template for MVP (schema supports more — §"Scope").
--   • `leases` — generated/draft lease documents (§3.4). Owner-scoped, full
--     CRUD, same shape as `rental_units` (0014_landlord_rentals.sql).
--     `pdf_url` stays NULL in this MVP: the PDF is rendered on demand from
--     `fields` by GET /api/landlord/leases/[id]/pdf (straightforward
--     server-rendered PDF, no Supabase Storage upload pipeline) rather than
--     persisted to Storage — column kept so a future task can start writing
--     it without a schema change.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rental_units
  ADD COLUMN IF NOT EXISTS apply_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex');

-- ─────────────────────────────────────────────────────────────────────────────
-- tenant_applications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id          UUID        NOT NULL REFERENCES rental_units(id) ON DELETE CASCADE,
  applicant_name   TEXT        NOT NULL CHECK (char_length(applicant_name) BETWEEN 2 AND 80),
  contact          TEXT        NOT NULL CHECK (char_length(contact) >= 5),
  employment       TEXT        CHECK (employment IS NULL OR char_length(employment) <= 200),
  income           NUMERIC(12,2) CHECK (income IS NULL OR income >= 0),
  residence        TEXT        CHECK (residence IS NULL OR char_length(residence) <= 200),
  -- Named `references_info`, not `references` — the latter is a reserved SQL keyword.
  references_info  TEXT        CHECK (references_info IS NULL OR char_length(references_info) <= 500),
  declaration      TEXT        CHECK (declaration IS NULL OR char_length(declaration) <= 2000),
  -- Required consent checkbox (§3.3, §5 zod: `consent: z.literal(true)`) —
  -- the CHECK makes the requirement authoritative at the database layer too.
  consent          BOOLEAN     NOT NULL DEFAULT FALSE CHECK (consent = TRUE),
  status           TEXT        NOT NULL DEFAULT 'new'
                                  CHECK (status IN ('new', 'reviewing', 'approved', 'rejected')),
  notes            TEXT        CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_applications_unit_id_created_idx
  ON tenant_applications (unit_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- lease_templates — public read-only reference data (0013_mortgage_rates.sql
-- pattern: no INSERT/UPDATE/DELETE policy, so only the service role can write).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lease_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  country    TEXT        NOT NULL CHECK (char_length(country) = 2),
  lang       TEXT        NOT NULL CHECK (lang IN ('hy', 'ru', 'en')),
  deal_type  TEXT        NOT NULL CHECK (deal_type IN ('long_term', 'short_term')),
  name       TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- leases
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leases (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id        UUID        NOT NULL REFERENCES rental_units(id) ON DELETE CASCADE,
  template_id    UUID        REFERENCES lease_templates(id) ON DELETE SET NULL,
  application_id UUID        REFERENCES tenant_applications(id) ON DELETE SET NULL,
  fields         JSONB       NOT NULL,
  -- Rendered on demand from `fields` (see header note) — not written by this task.
  pdf_url        TEXT,
  status         TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leases_owner_id_created_idx
  ON leases (owner_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tenant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases              ENABLE ROW LEVEL SECURITY;

-- tenant_applications: owner-scoped via the owning unit (docs/en/pages/
-- 19-landlord.md §5 "the landlord sees only their own units/applications").
-- No public SELECT/UPDATE policy: an applicant never reads their own
-- submission back through this table (the public form is insert-only, via
-- the service-role client — see header note above).
CREATE POLICY "tenant_applications: owner can select own"
  ON tenant_applications FOR SELECT
  USING (unit_id IN (SELECT id FROM rental_units WHERE owner_id = auth.uid()));

CREATE POLICY "tenant_applications: owner can insert own"
  ON tenant_applications FOR INSERT
  WITH CHECK (unit_id IN (SELECT id FROM rental_units WHERE owner_id = auth.uid()));

CREATE POLICY "tenant_applications: owner can update own"
  ON tenant_applications FOR UPDATE
  USING (unit_id IN (SELECT id FROM rental_units WHERE owner_id = auth.uid()))
  WITH CHECK (unit_id IN (SELECT id FROM rental_units WHERE owner_id = auth.uid()));

-- lease_templates: public read-only reference data.
CREATE POLICY "lease_templates: public can select"
  ON lease_templates FOR SELECT USING (true);

-- leases: strict owner-scoping, same shape as rental_units.
CREATE POLICY "leases: owner can select own"
  ON leases FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "leases: owner can insert own"
  ON leases FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "leases: owner can update own"
  ON leases FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "leases: owner can delete own"
  ON leases FOR DELETE USING (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed — a single English, long-term template so /landlord/lease isn't
-- empty in review (schema already supports more per country/lang/deal-type,
-- per the task's own "Scope" note).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO lease_templates (country, lang, deal_type, name, body)
SELECT 'AM', 'en', 'long_term', 'Standard residential lease (English)',
  'A standard long-term residential lease agreement. Advisory template only — not legal advice; verify compliance with local law before use.'
WHERE NOT EXISTS (
  SELECT 1 FROM lease_templates WHERE country = 'AM' AND lang = 'en' AND deal_type = 'long_term'
);
