-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002_favorites_saved_price.sql
-- Adds saved_price to favorites and defines RLS policies for core tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── favorites.saved_price ─────────────────────────────────────────────────────
-- Records the property price at the moment the favorite was created.
-- Used to compute price_change_pct on the Favorites page.
ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS saved_price NUMERIC(15, 2);

-- ── RLS policies — favorites ──────────────────────────────────────────────────
-- Allow authenticated users to manage only their own favorites.

CREATE POLICY IF NOT EXISTS "favorites_select_own"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "favorites_insert_own"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "favorites_delete_own"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ── RLS policies — properties (public read) ───────────────────────────────────
CREATE POLICY IF NOT EXISTS "properties_select_active"
  ON properties FOR SELECT
  USING (status IN ('active', 'pending', 'sold', 'archived') OR owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "properties_insert_own"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "properties_update_own"
  ON properties FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY IF NOT EXISTS "properties_delete_own"
  ON properties FOR DELETE
  USING (auth.uid() = owner_id);

-- ── RLS policies — property_media (public read) ───────────────────────────────
CREATE POLICY IF NOT EXISTS "property_media_select_all"
  ON property_media FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "property_media_insert_own"
  ON property_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_media.property_id
        AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "property_media_delete_own"
  ON property_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_media.property_id
        AND properties.owner_id = auth.uid()
    )
  );
