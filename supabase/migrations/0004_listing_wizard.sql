-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0004_listing_wizard.sql
-- Adds columns needed by the 6-step listing-creation wizard (Phase 1).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend the property_type CHECK to include 'newdev'
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_property_type_check
    CHECK (property_type IN ('apartment', 'house', 'commercial', 'land', 'garage', 'newdev'));

-- 2. Additional location columns
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS country         TEXT NOT NULL DEFAULT 'AM',
  ADD COLUMN IF NOT EXISTS region          TEXT,
  ADD COLUMN IF NOT EXISTS lat             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS hide_exact_address BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Property characteristic columns (wizard Step 3)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS condition       TEXT
    CHECK (condition IN ('new', 'renovated', 'good', 'needs_renovation')),
  ADD COLUMN IF NOT EXISTS heating         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS balcony         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS elevator        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS negotiable      BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Rent-specific columns (wizard Step 5)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS utilities_included   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit              NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS min_rent_term_months SMALLINT;

-- 5. Contact info (wizard Step 6) — snapshot from profile at publish time
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS contact_name        TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone       TEXT,
  ADD COLUMN IF NOT EXISTS contact_preference  TEXT
    CHECK (contact_preference IN ('phone_and_chat', 'chat_only'));

-- 6. Optional media URLs stored directly on the listing
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS video_url       TEXT,
  ADD COLUMN IF NOT EXISTS tour360_url     TEXT;

-- 7. Index on owner + status for limit-check query
CREATE INDEX IF NOT EXISTS properties_owner_status_idx
  ON properties (owner_id, status);
