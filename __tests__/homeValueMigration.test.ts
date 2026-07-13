/**
 * Static check for the Page 12 (Home Value Tool) Supabase migration
 * (supabase/migrations/0010_home_value_estimates.sql).
 *
 * There is no live Supabase instance in CI to exercise RLS against, so this
 * is the "documented RLS check" (same pattern as
 * __tests__/savedSearchesMigration.test.ts): it asserts, by reading the
 * migration SQL itself, that:
 *   - `home_value_estimates` enables Row Level Security.
 *   - the SELECT policy scopes rows to `auth.uid() = owner_id` (owner-only —
 *     the hash-holder read path is served by the service-role client in
 *     GET /api/home-value/[hash], never a permissive RLS policy — see the
 *     migration's own comment for the rationale).
 *   - the INSERT policy also scopes to `auth.uid() = owner_id` (defense in
 *     depth only; the real write path is the service-role insert in
 *     POST /api/home-value/estimate).
 *   - there is no UPDATE/DELETE policy (immutable snapshot cache).
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production):
 *   1. As user A, `select * from home_value_estimates` — only rows where
 *      owner_id = A should return; other users'/guests' estimates must not
 *      appear.
 *   2. Using only the anon key (no session), `select * from
 *      home_value_estimates` — 0 rows (guests cannot enumerate the table;
 *      the share-link read only works through the app's own
 *      GET /api/home-value/[hash] route with the service-role key).
 *   3. As user A, attempt to `insert into home_value_estimates (..., owner_id)
 *      values (..., '<user B's id>')` — must be rejected by RLS.
 *   4. As user A, attempt to `update`/`delete` any row — must affect 0 rows
 *      (no policy exists for either, so RLS denies by default).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0010_home_value_estimates.sql'),
  'utf-8',
)

describe('0010_home_value_estimates.sql — table shape', () => {
  it('creates the home_value_estimates table', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS home_value_estimates/)
  })

  it('has a unique, not-null hash column (the share-link bearer token)', () => {
    expect(migrationSql).toMatch(/hash\s+TEXT\s+NOT NULL UNIQUE/)
  })

  it('owner_id is nullable and references profiles(id) ON DELETE SET NULL (guests have no owner)', () => {
    expect(migrationSql).toMatch(/owner_id\s+UUID\s+REFERENCES profiles\(id\) ON DELETE SET NULL/)
  })

  it('constrains property_type, condition, currency, confidence, fallback_level to their known enums', () => {
    expect(migrationSql).toMatch(/CHECK \(property_type IN \('apartment', 'house', 'land', 'commercial'\)\)/)
    expect(migrationSql).toMatch(/CHECK \(condition IN \('new', 'renovated', 'good', 'needs_renovation'\)\)/)
    expect(migrationSql).toMatch(/CHECK \(currency IN \('AMD', 'USD', 'EUR', 'RUB'\)\)/)
    expect(migrationSql).toMatch(/CHECK \(confidence IN \('high', 'medium', 'low'\)\)/)
    expect(migrationSql).toMatch(/CHECK \(fallback_level IN \('district', 'city', 'none'\)\)/)
  })
})

describe('0010_home_value_estimates.sql — RLS is enabled', () => {
  it('enables RLS on home_value_estimates', () => {
    expect(migrationSql).toMatch(/ALTER TABLE home_value_estimates ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0010_home_value_estimates.sql — policies scope to the owner, no broader grant', () => {
  it('SELECT policy restricts to the owner (no public/anon read-by-hash policy)', () => {
    const match = migrationSql.match(
      /CREATE POLICY "home_value_estimates: owner can select own"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = owner_id')
  })

  it('INSERT policy requires the caller to be the owner (defense in depth; real writes use the service role)', () => {
    const match = migrationSql.match(
      /CREATE POLICY "home_value_estimates: owner can insert own"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = owner_id')
  })

  it('has exactly two policies — no UPDATE/DELETE, no unrestricted grant slipped in', () => {
    const policyCount = (migrationSql.match(/CREATE POLICY/g) ?? []).length
    expect(policyCount).toBe(2)
  })

  it('neither actual policy clause grants an unrestricted USING/WITH CHECK (true)', () => {
    // Scoped to the CREATE POLICY statements themselves, not the prose
    // comments above them (which legitimately *discuss* why `USING (true)`
    // would be unsafe here).
    const policyBlocks = migrationSql.match(/CREATE POLICY[\s\S]*?;/g) ?? []
    expect(policyBlocks.length).toBe(2)
    for (const block of policyBlocks) {
      expect(block).not.toMatch(/USING \(true\)/)
      expect(block).not.toMatch(/WITH CHECK \(true\)/)
    }
  })
})
