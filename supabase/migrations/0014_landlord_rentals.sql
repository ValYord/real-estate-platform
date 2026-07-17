-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0014_landlord_rentals.sql
-- Page 19 — Landlord Tools: Hub + Manage Rentals (MVP): /landlord, /landlord/rentals.
--
-- Adds:
--   • `rental_units` — a landlord's rental property units. Owner-scoped
--     (RLS `owner_id = auth.uid()`), full CRUD limited to the owning user.
--
-- MVP simplification (docs/en/pages/19-landlord.md §5 lists `leases` and
-- `rent_payments` as separate entities backing the Tenant/Lease/Payments
-- tabs): this task ships only "Manage rentals" (§3.2), and the Lease
-- Documents tab is explicitly deferred to the lease-generation task. The
-- Tenant/Payments tabs in this task's scope render read-only summary fields
-- (tenant_name/tenant_contact/lease_end/payment_status/next_payment_due)
-- denormalized directly onto `rental_units` rather than standing up the full
-- `leases`/`rent_payments` tables now — those ship with the Lease-generation
-- and Rent-collection tasks per the spec's own phasing.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rental_units (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address          TEXT        NOT NULL CHECK (char_length(address) BETWEEN 1 AND 200),
  type             TEXT        NOT NULL
                                  CHECK (type IN ('apartment', 'house', 'studio', 'commercial', 'other')),
  area_m2          NUMERIC(8,2) CHECK (area_m2 IS NULL OR area_m2 > 0),
  rent             NUMERIC(12,2) NOT NULL CHECK (rent >= 0),
  currency         TEXT        NOT NULL CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  status           TEXT        NOT NULL DEFAULT 'vacant'
                                  CHECK (status IN ('occupied', 'vacant', 'listed')),
  photo_url        TEXT,
  -- Tenant tab (MVP-denormalized, see header note above).
  tenant_name      TEXT,
  tenant_contact   TEXT,
  lease_end        DATE,
  -- Payments tab (MVP-denormalized, see header note above).
  payment_status   TEXT        CHECK (payment_status IS NULL OR payment_status IN ('paid', 'pending', 'overdue')),
  next_payment_due DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rental_units_owner_id_created_idx
  ON rental_units (owner_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — strict owner-scoping (docs/en/pages/19-landlord.md §5:
-- "the landlord sees only their own units").
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE rental_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_units: owner can select own"
  ON rental_units FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "rental_units: owner can insert own"
  ON rental_units FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "rental_units: owner can update own"
  ON rental_units FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "rental_units: owner can delete own"
  ON rental_units FOR DELETE USING (auth.uid() = owner_id);
