/**
 * Static check for the Page 26 (360° Virtual Tour Viewer) Supabase migration
 * (supabase/migrations/0011_virtual_tour.sql), following the same pattern as
 * __tests__/homeValueMigration.test.ts (no live Supabase instance in CI to
 * exercise RLS against).
 *
 * Asserts, by reading the migration SQL itself, that:
 *   - `tour_type`/`tour_data` are added as nullable columns on `properties`
 *     (not a new `listings` table — this schema's equivalent — and not on
 *     `property_media`, which already has an unrelated concept).
 *   - `tour_type` is constrained to the three known enum values.
 *   - no new RLS policy is added (none is needed — see the migration's own
 *     comment: the existing `properties` policies are column-agnostic).
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production):
 *   1. As a guest (anon key, no session), `select tour_type, tour_data from
 *      properties where status = 'active'` — the two new columns come back
 *      exactly like any other column on an active listing (existing
 *      "properties: active listings are public" policy already covers them).
 *   2. As a guest, `select tour_type, tour_data from properties where status
 *      = 'draft'` (someone else's draft) — 0 rows, same as any other column.
 *   3. As the owner, `update properties set tour_type = 'panorama', tour_data
 *      = '{"panoramaUrls":["https://..."]}' where id = '<own listing>'` —
 *      succeeds (existing "properties: owner can update" policy).
 *   4. As a different authenticated user, attempt the same update on someone
 *      else's listing — 0 rows affected (RLS denies).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0011_virtual_tour.sql'),
  'utf-8',
)

describe('0011_virtual_tour.sql — column shape', () => {
  it('adds tour_type and tour_data to the properties table (this schema\'s "listings" equivalent)', () => {
    expect(migrationSql).toMatch(/ALTER TABLE properties/)
    expect(migrationSql).toMatch(/ADD COLUMN IF NOT EXISTS tour_type TEXT/)
    expect(migrationSql).toMatch(/ADD COLUMN IF NOT EXISTS tour_data JSONB/)
  })

  it('does not touch property_media (the unrelated media_type = \'virtual_tour\' concept)', () => {
    expect(migrationSql).not.toMatch(/ALTER TABLE property_media/)
  })

  it('constrains tour_type to the three known tour kinds', () => {
    expect(migrationSql).toMatch(/CHECK \(tour_type IN \('panorama', 'embed_url', 'video'\)\)/)
  })

  it('neither column is declared NOT NULL (both are optional)', () => {
    expect(migrationSql).not.toMatch(/tour_type TEXT NOT NULL/)
    expect(migrationSql).not.toMatch(/tour_data JSONB NOT NULL/)
  })

  it('adds a CHECK keeping tour_type/tour_data both-null or both-set together', () => {
    expect(migrationSql).toMatch(/properties_tour_type_data_together/)
    expect(migrationSql).toMatch(/tour_type IS NULL AND tour_data IS NULL/)
    expect(migrationSql).toMatch(/tour_type IS NOT NULL AND tour_data IS NOT NULL/)
  })
})

describe('0011_virtual_tour.sql — no RLS changes needed', () => {
  it('does not create any new policy (existing column-agnostic properties policies already cover the new columns)', () => {
    expect(migrationSql).not.toMatch(/CREATE POLICY/)
  })

  it('does not disable or alter RLS on properties', () => {
    expect(migrationSql).not.toMatch(/DISABLE ROW LEVEL SECURITY/)
    expect(migrationSql).not.toMatch(/ALTER TABLE properties ENABLE ROW LEVEL SECURITY/)
  })
})
