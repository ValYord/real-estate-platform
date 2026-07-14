-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0011_virtual_tour.sql
-- Page 26 — 360° Virtual Tour Viewer (Part A). Adds the columns the property
-- detail page's viewer reads from.
--
-- Table choice: `properties`, not `listings` — this schema's equivalent table
-- is named `properties` (see 0001_init.sql). Not `property_media` either:
-- that table already has an unrelated `media_type = 'virtual_tour'` value
-- used for uploaded photo/video *files* — this migration doesn't touch it.
--
-- Relationship to the existing `tour360_url` column (added in
-- 0004_listing_wizard.sql): that column is a Part B (listing-wizard uploader)
-- field, out of scope for this task. `tour_type`/`tour_data` below are a
-- separate, richer pair introduced for Part A (the viewer) that can represent
-- all three tour kinds the viewer supports (panorama image set, embed link,
-- or video) via a single small JSON payload, which a single TEXT URL column
-- cannot. The two column pairs are intentionally independent; wiring
-- `tour360_url` into `tour_type`/`tour_data` (or retiring it) is Part B scope.
--
-- RLS: no new policy is needed. The existing policies on `properties`
-- (0002_rls_policies.sql) are defined with column-agnostic USING/WITH CHECK
-- clauses (`status = 'active'`, `auth.uid() = owner_id`, ...) that apply to
-- the whole row, so they automatically cover these two new columns exactly
-- like every other column on the table — a public viewer sees tour_type/
-- tour_data only when the listing is active (or when they're the owner),
-- and only the owner can write them.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS tour_type TEXT
    CHECK (tour_type IN ('panorama', 'embed_url', 'video')),
  ADD COLUMN IF NOT EXISTS tour_data JSONB;

-- A tour_type without tour_data (or vice versa) is meaningless — either both
-- are set, or both are null. This keeps `tour_type IS NOT NULL` a reliable
-- "does this listing have a tour" check (used by the property page to decide
-- whether to render the [🌐 360°] tab at all — see PropertyGallery.tsx).
ALTER TABLE properties
  ADD CONSTRAINT properties_tour_type_data_together
    CHECK (
      (tour_type IS NULL AND tour_data IS NULL) OR
      (tour_type IS NOT NULL AND tour_data IS NOT NULL)
    );
