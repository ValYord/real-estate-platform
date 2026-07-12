-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0008_agent_profile.sql
-- Page 10 — Agent / Agency Profile (MVP).
--
-- `profiles` already carries the base agent fields added in
-- 0003_profile_agent_fields.sql (agency_name, license_no) and 0001_init.sql
-- (agent_slug, agent_rating, agent_review_count, tier, role). This migration
-- adds only the incremental fields the profile page needs:
--   • `agents`        — 1:1 extension of `profiles` (bio, specialties,
--                        languages, scope, verified, status, response time).
--   • `agent_reviews` — public reviews, one per (agent, author).
--   • `agent_leads`   — "Send a request" form submissions.
-- and extends `reports` (0006) so a review can be reported through the same
-- generic endpoint used for conversation reports.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENTS — extends profiles(id) 1:1. A row here is what turns a profile into
-- a public agent storefront; profiles.role should be 'agent' as well, but
-- that is enforced at the application layer (agent onboarding), not here.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  user_id             UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Localized bio, e.g. { "hy": "...", "ru": "...", "en": "..." }
  bio                 JSONB       NOT NULL DEFAULT '{}'::jsonb,
  specialties         TEXT[]      NOT NULL DEFAULT '{}',
  languages           TEXT[]      NOT NULL DEFAULT '{}',
  -- Service areas / scope of operation, e.g. {"Yerevan", "Kotayk"}
  scope               TEXT[]      NOT NULL DEFAULT '{}',
  verified            BOOLEAN     NOT NULL DEFAULT FALSE,
  status              TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  avg_response_hours  NUMERIC,
  deals_closed_count  INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Public storefront — anyone (including anonymous) can read agent metadata.
-- Note: the `/api/agents/[slug]` route reads through the service-role client
-- so it can distinguish 404 (no row) from 410 (status = 'suspended') in a
-- single query; this SELECT policy additionally allows direct anon/browser
-- reads (e.g. future client-side queries) without exposing anything sensitive.
CREATE POLICY "agents: public can select"
  ON agents
  FOR SELECT
  USING (true);

CREATE POLICY "agents: owner can insert"
  ON agents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents: owner can update"
  ON agents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENT_REVIEWS — one review per (agent, author). Self-review is blocked
-- server-side (422) and, defense-in-depth, by the INSERT policy below.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text         TEXT        NOT NULL CHECK (char_length(text) BETWEEN 10 AND 1000),
  reply        TEXT,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (agent_id <> author_id),
  UNIQUE (agent_id, author_id)
);

CREATE INDEX IF NOT EXISTS agent_reviews_agent_id_created_idx
  ON agent_reviews (agent_id, created_at DESC);

ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_reviews: public can select"
  ON agent_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "agent_reviews: author can insert"
  ON agent_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = author_id AND auth.uid() <> agent_id);

-- The author can edit their own review text; the agent being reviewed can
-- write a reply. Column-level enforcement (author cannot touch `reply`,
-- agent cannot touch `text`/`rating`) happens at the API layer.
CREATE POLICY "agent_reviews: author or agent can update"
  ON agent_reviews
  FOR UPDATE
  USING (auth.uid() = author_id OR auth.uid() = agent_id)
  WITH CHECK (auth.uid() = author_id OR auth.uid() = agent_id);

-- Keep profiles.agent_rating / agent_review_count (used by the dashboard and
-- property ContactCard) in sync whenever reviews change.
CREATE OR REPLACE FUNCTION agent_reviews_sync_profile_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_agent UUID := COALESCE(NEW.agent_id, OLD.agent_id);
BEGIN
  UPDATE profiles
  SET agent_rating = stats.avg_rating,
      agent_review_count = stats.review_count
  FROM (
    SELECT
      COALESCE(AVG(rating)::numeric(3,2), 0) AS avg_rating,
      COUNT(*) AS review_count
    FROM agent_reviews
    WHERE agent_id = target_agent
  ) AS stats
  WHERE profiles.id = target_agent;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS agent_reviews_sync_profile_stats_ins ON agent_reviews;
CREATE TRIGGER agent_reviews_sync_profile_stats_ins
  AFTER INSERT OR UPDATE OR DELETE ON agent_reviews
  FOR EACH ROW
  EXECUTE FUNCTION agent_reviews_sync_profile_stats();

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENT_LEADS — "Send a request" form submissions (docs/en/pages/10 §5).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_type      TEXT        NOT NULL CHECK (deal_type IN ('buy', 'sell', 'rent')),
  property_type  TEXT        NOT NULL,
  city           TEXT        NOT NULL,
  budget_min     NUMERIC,
  budget_max     NUMERIC,
  currency       TEXT        NOT NULL CHECK (currency IN ('AMD', 'RUB', 'USD', 'EUR')),
  rooms          INTEGER,
  name           TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  message        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_leads_agent_id_created_idx
  ON agent_leads (agent_id, created_at DESC);

ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;

-- Only the target agent can read the leads sent to them.
CREATE POLICY "agent_leads: agent can select own"
  ON agent_leads
  FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "agent_leads: user can insert own"
  ON agent_leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORTS — allow reporting an agent review through the existing endpoint.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES agent_reviews(id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_target_check;
ALTER TABLE reports ADD CONSTRAINT reports_target_check
  CHECK (conversation_id IS NOT NULL OR review_id IS NOT NULL);
