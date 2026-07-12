-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007_saved_searches.sql
-- Page 08 — Saved Searches + Alerts (Phase 2).
--
-- Adds the `saved_searches` table. The cron/scheduled match-detection job and
-- the Resend email digest are explicitly out of scope for this migration:
-- `last_alerted_at` and `new_match_count` are plain columns, writable only
-- through the CRUD API (app/api/saved-searches/*) in this iteration.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_searches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Length (<= 60 chars) is enforced by zod at the API layer (savedSearchSchema).
  name              TEXT        NOT NULL,
  -- Same shape as lib/search/filtersSchema.ts's Filters (deal, type, city,
  -- district, priceMin/Max, beds, baths, areaMin, sort, page, bounds).
  filters           JSONB       NOT NULL,
  -- Generated + stored so the UNIQUE index below is the authoritative,
  -- race-safe dedupe check — not an app-layer "check then insert", which has
  -- a TOCTOU race under rapid double-clicks.
  filters_hash      TEXT        GENERATED ALWAYS AS (md5(filters::text)) STORED,
  alert_frequency   TEXT        NOT NULL DEFAULT 'daily'
                                  CHECK (alert_frequency IN ('off', 'instant', 'daily', 'weekly')),
  -- Plain column — no cron writes it yet (see notice above).
  last_alerted_at   TIMESTAMPTZ,
  new_match_count   INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, filters_hash)
);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_created_idx
  ON saved_searches (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — every policy scoped to auth.uid() = user_id (owner-only), matching
-- the blocks/reports policy style in 0006_messages_inbox.sql.
--
-- The one exception is the unsubscribe endpoint (GET
-- /api/saved-searches/unsubscribe?token=...), which must flip
-- alert_frequency to 'off' without a logged-in session. That route uses the
-- service-role client (lib/supabase/admin.ts, server-only) scoped to the
-- single row identified by a verified HMAC-signed token — it does not rely
-- on these RLS policies, and never runs an unscoped query.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_searches: owner can select"
  ON saved_searches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_searches: owner can insert"
  ON saved_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_searches: owner can update"
  ON saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "saved_searches: owner can delete"
  ON saved_searches
  FOR DELETE
  USING (auth.uid() = user_id);
