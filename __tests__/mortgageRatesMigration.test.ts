/**
 * Static check for the Page 14 (Mortgage Rates Hub MVP) Supabase migration
 * (supabase/migrations/0013_mortgage_rates.sql). There is no live Supabase
 * instance in CI to exercise RLS against, so this asserts, by reading the
 * migration SQL itself, that the documented table/RLS shape exists (same
 * pattern as __tests__/savedSearchesMigration.test.ts /
 * __tests__/homeValueMigration.test.ts).
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production, since `supabase db push` isn't part of this CI):
 *   1. As an anon/no-session client, `select * from mortgage_rates` and
 *      `select * from partner_banks` — both should succeed.
 *   2. As that same anon client, attempt an `insert`/`update`/`delete` on
 *      either table — RLS must reject it (no write policy exists).
 *   3. As user A, `select * from preapproval_leads` — only rows where
 *      user_id = A (or, if A is an admin, all rows) should return.
 *   4. As user A, attempt to `insert` a preapproval_leads row with
 *      user_id = B — RLS must reject it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0013_mortgage_rates.sql'),
  'utf-8',
)

describe('0013_mortgage_rates.sql — table shape', () => {
  it('creates all three tables', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS partner_banks/)
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS mortgage_rates/)
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS preapproval_leads/)
  })

  it('mortgage_rates.bank_id references partner_banks(id) with ON DELETE CASCADE', () => {
    expect(migrationSql).toMatch(
      /bank_id\s+UUID\s+NOT NULL REFERENCES partner_banks\(id\) ON DELETE CASCADE/,
    )
  })

  it('preapproval_leads.user_id references profiles(id) with ON DELETE CASCADE', () => {
    expect(migrationSql).toMatch(
      /user_id\s+UUID\s+NOT NULL REFERENCES profiles\(id\) ON DELETE CASCADE/,
    )
  })

  it('constrains loan_type to the five documented values', () => {
    expect(migrationSql).toMatch(
      /CHECK \(loan_type IN \('primary', 'secondary', 'new_construction', 'refinance', 'government'\)\)/,
    )
  })

  it('constrains currency to the four supported values on both mortgage_rates and preapproval_leads', () => {
    const matches = migrationSql.match(/currency IN \('AMD', 'USD', 'EUR', 'RUB'\)/g)
    expect(matches?.length).toBeGreaterThanOrEqual(2)
  })

  it('constrains term_max >= term_min and rate_pct >= 0', () => {
    expect(migrationSql).toMatch(/term_max\s+SMALLINT\s+NOT NULL CHECK \(term_max >= term_min\)/)
    expect(migrationSql).toMatch(/rate_pct\s+NUMERIC\(5,2\)\s+NOT NULL CHECK \(rate_pct >= 0\)/)
  })

  it('requires consent on preapproval_leads', () => {
    expect(migrationSql).toMatch(/consent\s+BOOLEAN\s+NOT NULL/)
  })
})

describe('0013_mortgage_rates.sql — RLS is enabled on all three tables', () => {
  it('enables RLS', () => {
    expect(migrationSql).toMatch(/ALTER TABLE partner_banks\s+ENABLE ROW LEVEL SECURITY/)
    expect(migrationSql).toMatch(/ALTER TABLE mortgage_rates\s+ENABLE ROW LEVEL SECURITY/)
    expect(migrationSql).toMatch(/ALTER TABLE preapproval_leads ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0013_mortgage_rates.sql — public read / no public write on reference data', () => {
  it('partner_banks and mortgage_rates each have a public SELECT policy', () => {
    expect(migrationSql).toMatch(/CREATE POLICY "partner_banks: public can select"[\s\S]*?FOR SELECT/)
    expect(migrationSql).toMatch(/CREATE POLICY "mortgage_rates: public can select"[\s\S]*?FOR SELECT/)
  })

  it('neither table has an INSERT/UPDATE/DELETE policy (service-role-only writes)', () => {
    const forbidden = /CREATE POLICY[^;]*(partner_banks|mortgage_rates)[^;]*FOR (INSERT|UPDATE|DELETE)/
    expect(migrationSql).not.toMatch(forbidden)
  })
})

describe('0013_mortgage_rates.sql — preapproval_leads RLS (owner or admin)', () => {
  it('SELECT policy references both auth.uid() = user_id and is_admin()', () => {
    const match = migrationSql.match(
      /CREATE POLICY "preapproval_leads: owner or admin can select"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = user_id')
    expect(match?.[1]).toContain('is_admin()')
  })

  it('does not redefine is_admin() (reuses 0012_admin_moderation.sql\'s helper)', () => {
    expect(migrationSql).not.toMatch(/CREATE (OR REPLACE )?FUNCTION is_admin/)
  })

  it('INSERT policy requires the caller to be the owner', () => {
    const match = migrationSql.match(
      /CREATE POLICY "preapproval_leads: user can insert own"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = user_id')
  })
})

describe('0013_mortgage_rates.sql — seed data', () => {
  it('seeds partner_banks covering at least 2 distinct countries', () => {
    const countryTokens = migrationSql.match(/'\{(AM|RU)\}'/g) ?? []
    const distinct = new Set(countryTokens)
    expect(distinct.size).toBeGreaterThanOrEqual(2)
  })

  it('seeds mortgage_rates rows for at least 2 distinct countries', () => {
    const hasAm = /'AM', 'AMD'|'AM', 'USD'/.test(migrationSql)
    const hasRu = /'RU', 'RUB'|'RU', 'USD'/.test(migrationSql)
    expect(hasAm).toBe(true)
    expect(hasRu).toBe(true)
  })

  it('guards the rate seed insert so re-running the migration does not duplicate rows', () => {
    expect(migrationSql).toMatch(/IF NOT EXISTS \(SELECT 1 FROM mortgage_rates\)/)
  })
})
