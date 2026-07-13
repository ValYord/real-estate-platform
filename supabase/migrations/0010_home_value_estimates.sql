-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0010_home_value_estimates.sql
-- Page 12 — Home Value Tool (Phase 1 MVP heuristic).
--
-- Adds `home_value_estimates`: an append-only snapshot cache of computed
-- valuations, one row per "Calculate estimate" submit. The row's `hash`
-- column is the shareable `/home-value/[estimateHash]` id.
--
-- RLS design — read access ("owner or estimate-hash holder can read"):
--   - Owners (logged-in users) can SELECT their own rows via the normal RLS
--     policy below (`auth.uid() = owner_id`).
--   - Guests, and anyone loading a shared `/home-value/[hash]` link, are NOT
--     granted a general "read by hash" RLS policy. Postgres RLS `USING`
--     clauses cannot see "which hash the caller filtered for" — a policy
--     permissive enough to allow SELECT-by-hash for an anonymous caller
--     (e.g. `USING (true)`) would also allow a full-table dump via the
--     public anon key, leaking every estimate's address/geo. Instead, the
--     hash lookup is served exclusively by `GET /api/home-value/[hash]`
--     using the service-role client, scoped to a single `WHERE hash = $1`
--     query — the hash itself (12 random base64url chars, see
--     lib/home-value/hash.ts) is the unguessable bearer token, the same
--     "service-role bypass, narrowly scoped" pattern already used for the
--     saved-search unsubscribe link (0007_saved_searches.sql).
--
-- Write access ("only the creator/service role can write"):
--   - The only write path is `POST /api/home-value/estimate`, which always
--     inserts via the service-role client (guests have no session to attach
--     an owner_id to). The INSERT policy below is defense-in-depth only, in
--     case a client ever queries this table directly with the anon key: it
--     permits an authenticated user to insert solely under their own id and
--     blocks anonymous direct inserts outright (owner_id IS NULL never
--     satisfies `auth.uid() = owner_id`).
--   - No UPDATE/DELETE policy exists — the table is an immutable cache; not
--     even the owner can edit a past snapshot (a "recalculate" always
--     produces a new row/hash).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS home_value_estimates (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  hash                  TEXT           NOT NULL UNIQUE,
  -- NULL for guest-computed estimates; set when the caller was logged in.
  owner_id              UUID           REFERENCES profiles(id) ON DELETE SET NULL,

  -- Inputs (public-ish: a property address + characteristics — the same kind
  -- of data already shown on any public listing; no contact/PII is stored).
  lat                   DOUBLE PRECISION NOT NULL,
  lng                   DOUBLE PRECISION NOT NULL,
  country               TEXT           NOT NULL DEFAULT 'AM',
  city                  TEXT           NOT NULL,
  district              TEXT,
  address_label         TEXT,
  property_type         TEXT           NOT NULL
                                          CHECK (property_type IN ('apartment', 'house', 'land', 'commercial')),
  area_m2               NUMERIC(10, 2) NOT NULL,
  rooms                 SMALLINT,
  floor                 SMALLINT,
  floors_total          SMALLINT,
  year_built            SMALLINT,
  condition             TEXT           CHECK (condition IN ('new', 'renovated', 'good', 'needs_renovation')),

  -- Outputs (Phase-1 heuristic result — see lib/home-value/heuristic.ts).
  estimate              NUMERIC(15, 2) NOT NULL,
  low                   NUMERIC(15, 2) NOT NULL,
  high                  NUMERIC(15, 2) NOT NULL,
  currency              TEXT           NOT NULL DEFAULT 'AMD'
                                          CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  price_per_m2          NUMERIC(15, 2) NOT NULL,
  median_price_per_m2   NUMERIC(15, 2) NOT NULL,
  confidence            TEXT           NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  comps_count           INTEGER        NOT NULL DEFAULT 0,
  fallback_level        TEXT           NOT NULL DEFAULT 'district'
                                          CHECK (fallback_level IN ('district', 'city', 'none')),
  factors               JSONB          NOT NULL DEFAULT '[]',

  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS home_value_estimates_owner_created_idx
  ON home_value_estimates (owner_id, created_at DESC);

-- Lookups by hash are exact-match single-row reads (service-role client) —
-- a plain btree index (UNIQUE already creates one) is sufficient.

ALTER TABLE home_value_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_value_estimates: owner can select own"
  ON home_value_estimates
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "home_value_estimates: owner can insert own"
  ON home_value_estimates
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
