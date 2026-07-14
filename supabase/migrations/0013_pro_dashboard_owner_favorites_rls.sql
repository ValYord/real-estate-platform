-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0013_pro_dashboard_owner_favorites_rls.sql
-- Page 18 (Pro Dashboard) — Overview KPIs / Analytics charts read `favorites`
-- scoped to the caller's own listings (GET /api/pro/overview, GET
-- /api/pro/analytics), via the RLS-respecting anon-key server client (not the
-- service-role key — see lib/supabase/server.ts).
--
-- `favorites` only had a "favoriter can select their own rows" SELECT policy
-- (0002_favorites_saved_price.sql's "favorites_select_own" / 0002_rls_policies
-- .sql's "favorites: user can select own", both `USING (auth.uid() = user_id)`).
-- A listing *owner* querying who favorited their own properties is a different
-- caller from the favoriter, so those rows were invisible to them — the Pro
-- Dashboard's "Favorites" KPI/chart would always read 0 for every agent, not
-- just cross-tenant listings.
--
-- Adds a second, additive SELECT policy scoped to the listing owner. Multiple
-- permissive policies on the same table/action are OR'd by Postgres RLS, so
-- this only *adds* visibility (an owner seeing who favorited their own
-- listing) — it does not narrow or replace the existing favoriter-privacy
-- policy, and grants no cross-tenant access to other owners' favorites.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY IF NOT EXISTS "favorites: property owner can select"
  ON favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = favorites.property_id
        AND p.owner_id = auth.uid()
    )
  );
