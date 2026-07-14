-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0012_admin_moderation.sql
-- Page 24 — Admin Panel MVP (shell + dashboard + moderation queue).
--
-- Adds:
--   1. `is_admin()` — a SECURITY DEFINER helper used by every admin-facing RLS
--      policy below. Without SECURITY DEFINER, a policy on `properties` that
--      subqueries `profiles` to check `role = 'admin'` would itself be
--      filtered by `profiles`' own RLS policies for the *querying* role,
--      which works for the caller's own row (covered by the existing
--      "profiles: owner can select" policy) but would silently break if that
--      policy ever changes shape. Centralizing the check in one
--      SECURITY DEFINER function (owned by the migration role, bypasses RLS
--      internally, `SET search_path = public` to avoid search-path
--      hijacking) keeps every admin policy below simple and consistent.
--   2. `admin_actions` — audit log table (admin_id, action, target_type,
--      target_id, meta, created_at), admin-only read via `is_admin()`.
--   3. `properties.status` CHECK constraint extended with 'rejected' (the
--      page spec's reject flow needs it; the Phase 1 constraint in
--      0001_init.sql only allows active/draft/pending/archived/sold).
--   4. Admin RLS policies (defense-in-depth; the primary gate is the
--      server-side `requireAdmin()` guard in lib/admin/guard.ts):
--        - `profiles: admin can select all` — Dashboard's Users stat card and
--          the Moderation queue's owner-name column need to read *other*
--          users' profiles, not just the caller's own row.
--        - `properties: admin can select all` — Dashboard listing counts and
--          the Moderation queue must see pending/draft/etc. listings
--          regardless of owner (the existing policies only expose 'active'
--          publicly or the owner's own rows).
--        - `properties: admin can update all` — Approve/Reject write
--          `status` on listings the admin does not own.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- is_admin() helper
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- properties.status — add 'rejected'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
    CHECK (status IN ('active', 'draft', 'pending', 'archived', 'sold', 'rejected'));

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN_ACTIONS  (audit log)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL
                            CHECK (action IN ('listing_approved', 'listing_rejected')),
  target_type TEXT        NOT NULL
                            CHECK (target_type IN ('listing')),
  target_id   UUID        NOT NULL,
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_actions_target_idx
  ON admin_actions (target_type, target_id);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log
CREATE POLICY "admin_actions: admin can select"
  ON admin_actions
  FOR SELECT
  USING (is_admin());

-- Only admins can write audit rows, and only attributed to themselves
CREATE POLICY "admin_actions: admin can insert own"
  ON admin_actions
  FOR INSERT
  WITH CHECK (is_admin() AND admin_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin RLS: defense-in-depth on top of the server-side guard
-- ─────────────────────────────────────────────────────────────────────────────

-- Dashboard "Users" stat card + Moderation queue owner names need to read
-- other users' profiles (not just the caller's own row).
CREATE POLICY "profiles: admin can select all"
  ON profiles
  FOR SELECT
  USING (is_admin());

-- Dashboard listing-by-status counts + Moderation queue must see every
-- listing regardless of status/owner.
CREATE POLICY "properties: admin can select all"
  ON properties
  FOR SELECT
  USING (is_admin());

-- Approve/Reject write `status` on listings the admin does not own.
CREATE POLICY "properties: admin can update all"
  ON properties
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
