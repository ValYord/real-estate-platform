-- 0005_dashboard.sql — columns needed by the user dashboard (Phase 1)

-- ── Properties: views counter + expiry ───────────────────────────────────────
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS views_count  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ;

-- ── Profiles: phone verification + agent identity ───────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified     BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_slug         TEXT,
  ADD COLUMN IF NOT EXISTS agent_rating       NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS agent_review_count INTEGER  NOT NULL DEFAULT 0;

-- Index for efficient dashboard overview query
CREATE INDEX IF NOT EXISTS properties_owner_active_idx
  ON properties (owner_id, status)
  WHERE status = 'active';
