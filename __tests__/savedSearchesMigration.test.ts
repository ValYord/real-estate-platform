/**
 * Static check for the Page 08 (Saved Searches + Alerts) Supabase migration
 * (supabase/migrations/0007_saved_searches.sql).
 *
 * There is no live Supabase instance in CI to exercise RLS against, so this
 * is the "documented RLS check" referenced in the task's acceptance
 * criteria (same pattern as __tests__/messagesMigration.test.ts): it asserts,
 * by reading the migration SQL itself, that:
 *   - `saved_searches` enables Row Level Security.
 *   - every policy on it scopes rows to `auth.uid() = user_id`.
 *   - the dedupe unique index and the alert-frequency CHECK exist.
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production, since `supabase db push` isn't part of this CI):
 *   1. As user A, `select * from saved_searches` — only rows where
 *      user_id = A should return; other users' saved searches must not
 *      appear.
 *   2. As user A, attempt to `update saved_searches set name = 'x' where
 *      user_id = B` (another user's row) — must affect 0 rows (RLS denies
 *      it, not just the app-layer `.eq('user_id')` guard).
 *   3. As user A, attempt to `delete from saved_searches where user_id = B`
 *      — must affect 0 rows.
 *   4. Insert the same filters twice for user A — the second insert must
 *      fail with a unique-violation (23505) on (user_id, filters_hash).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0007_saved_searches.sql'),
  'utf-8',
)

describe('0007_saved_searches.sql — table shape', () => {
  it('creates the saved_searches table', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS saved_searches/)
  })

  it('has a filters_hash generated column driving a per-user unique index', () => {
    expect(migrationSql).toMatch(/filters_hash\s+TEXT\s+GENERATED ALWAYS AS \(md5\(filters::text\)\) STORED/)
    expect(migrationSql).toMatch(/UNIQUE \(user_id, filters_hash\)/)
  })

  it('constrains alert_frequency to the four known values', () => {
    expect(migrationSql).toMatch(
      /CHECK \(alert_frequency IN \('off', 'instant', 'daily', 'weekly'\)\)/,
    )
  })

  it('references profiles(id) with ON DELETE CASCADE for user_id', () => {
    expect(migrationSql).toMatch(/user_id\s+UUID\s+NOT NULL REFERENCES profiles\(id\) ON DELETE CASCADE/)
  })
})

describe('0007_saved_searches.sql — RLS is enabled', () => {
  it('enables RLS on saved_searches', () => {
    expect(migrationSql).toMatch(/ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0007_saved_searches.sql — every policy scopes to auth.uid() = user_id', () => {
  it('SELECT policy restricts to the owner', () => {
    const match = migrationSql.match(
      /CREATE POLICY "saved_searches: owner can select"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = user_id')
  })

  it('INSERT policy requires the caller to be the owner', () => {
    const match = migrationSql.match(
      /CREATE POLICY "saved_searches: owner can insert"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = user_id')
  })

  it('UPDATE policy restricts to the owner', () => {
    const match = migrationSql.match(
      /CREATE POLICY "saved_searches: owner can update"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = user_id')
  })

  it('DELETE policy restricts to the owner', () => {
    const match = migrationSql.match(
      /CREATE POLICY "saved_searches: owner can delete"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = user_id')
  })

  it('has exactly four policies — no broader/unrestricted grant slipped in', () => {
    const policyCount = (migrationSql.match(/CREATE POLICY/g) ?? []).length
    expect(policyCount).toBe(4)
  })
})
