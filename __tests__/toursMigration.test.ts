/**
 * Static check for the Page 27 (Schedule a Tour) Supabase migration
 * (supabase/migrations/0009_tours.sql).
 *
 * There is no live Supabase instance in CI to exercise RLS against, so this
 * is the "documented RLS check" referenced in the task's acceptance
 * criteria: it asserts, by reading the migration SQL itself, that:
 *   - `tours` enables Row Level Security.
 *   - the requester-select policy scopes to `auth.uid() = requester_id`.
 *   - the owner-select policy scopes to `auth.uid() = owner_id`.
 *   - no policy grants an unqualified `USING (true)` read.
 *   - the two partial unique indexes (per-user / per-guest-phone dedup) exist.
 *   - `notifications_type_check` is extended to include `'tour_requested'`.
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production, since `supabase db push` isn't part of this CI):
 *   1. As user A (owner of property X), `select * from tours` — only rows
 *      where A is `owner_id` or `requester_id` should return.
 *   2. As user B (not the owner or requester of any row on property X),
 *      `select * from tours where property_id = X` — must return zero rows.
 *   3. As an anonymous (unauthenticated) client, `select * from tours` —
 *      must return zero rows (no policy grants anon SELECT).
 *   4. Submit two tour requests for the same (property, logged-in user)
 *      while the first is still `status = 'pending'` — the second insert
 *      must be rejected with a unique-violation (23505).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(join(__dirname, '../supabase/migrations/0009_tours.sql'), 'utf-8')

describe('0009_tours.sql — RLS is enabled', () => {
  it('enables RLS on tours', () => {
    expect(migrationSql).toMatch(/ALTER TABLE tours ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0009_tours.sql — tours policies scope to auth.uid()', () => {
  it('requester SELECT policy restricts to auth.uid() = requester_id', () => {
    const match = migrationSql.match(
      /CREATE POLICY "tours: requester can select own"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = requester_id')
  })

  it('owner SELECT policy restricts to auth.uid() = owner_id', () => {
    const match = migrationSql.match(
      /CREATE POLICY "tours: owner can select own listings requests"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = owner_id')
  })

  it('INSERT policy allows the requester or an explicit NULL (guest) requester_id', () => {
    const match = migrationSql.match(/CREATE POLICY "tours: requester can insert own"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/)
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = requester_id')
    expect(match?.[1]).toContain('requester_id IS NULL')
  })

  it('no policy on tours grants an unqualified USING (true) read', () => {
    const selectPolicies = migrationSql.match(/CREATE POLICY "tours:[^"]*"\s*\n\s*ON tours FOR SELECT\s*\n\s*USING \(([\s\S]*?)\);/g) ?? []
    expect(selectPolicies.length).toBeGreaterThan(0)
    for (const policy of selectPolicies) {
      expect(policy).not.toMatch(/USING \(\s*true\s*\)/)
    }
  })

  it('status is pinned to the single MVP literal value', () => {
    expect(migrationSql).toMatch(/status\s+TEXT\s+NOT NULL DEFAULT 'pending' CHECK \(status = 'pending'\)/)
  })
})

describe('0009_tours.sql — "already requested" de-dup indexes', () => {
  it('has a partial unique index for one pending request per (property, logged-in requester)', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS tours_one_pending_per_user\s*\n\s*ON tours \(property_id, requester_id\)\s*\n\s*WHERE requester_id IS NOT NULL AND status = 'pending';/,
    )
  })

  it('has a partial unique index for one pending request per (property, guest phone)', () => {
    expect(migrationSql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS tours_one_pending_per_guest_phone\s*\n\s*ON tours \(property_id, phone\)\s*\n\s*WHERE requester_id IS NULL AND status = 'pending';/,
    )
  })
})

describe('0009_tours.sql — notifications type CHECK is extended', () => {
  it('re-defines notifications_type_check to include tour_requested', () => {
    expect(migrationSql).toMatch(/DROP CONSTRAINT IF EXISTS notifications_type_check/)
    const match = migrationSql.match(/ADD CONSTRAINT notifications_type_check\s*\n\s*CHECK \(type IN \(([\s\S]*?)\)\);/)
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain("'tour_requested'")
    // The original seven types must still be present — this migration extends, not replaces, the enum.
    expect(match?.[1]).toContain("'message'")
    expect(match?.[1]).toContain("'new_review'")
  })
})
