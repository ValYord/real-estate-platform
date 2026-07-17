/**
 * Static check for the Page 19 (Landlord Tools: Screening + Lease Generation)
 * Supabase migration (supabase/migrations/0015_landlord_screening_lease.sql).
 * There is no live Supabase instance in CI to exercise RLS against, so this
 * asserts, by reading the migration SQL itself, that the documented table/RLS
 * shape exists (same pattern as __tests__/mortgageRatesMigration.test.ts /
 * __tests__/homeValueMigration.test.ts).
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production):
 *   1. As landlord A, `select * from tenant_applications` — only rows whose
 *      unit_id belongs to A should return, even if landlord B has
 *      applications on their own units.
 *   2. As landlord A, attempt to `update`/`select` a `leases` row owned by
 *      landlord B directly by id — RLS must return zero rows.
 *   3. As an anon/no-session client, `insert into tenant_applications` — RLS
 *      must reject it (no public INSERT policy; the public form writes via
 *      the service-role client after re-validating the token server-side).
 *   4. As any authenticated user, `select * from lease_templates` — should
 *      succeed (public read-only reference data).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0015_landlord_screening_lease.sql'),
  'utf-8',
)

describe('0015_landlord_screening_lease.sql — table shape', () => {
  it('creates tenant_applications, lease_templates, and leases', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS tenant_applications/)
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS lease_templates/)
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS leases/)
  })

  it('adds rental_units.apply_token as a unique, backfilled bearer token', () => {
    expect(migrationSql).toMatch(
      /ALTER TABLE rental_units\s+ADD COLUMN IF NOT EXISTS apply_token TEXT UNIQUE DEFAULT/,
    )
  })

  it('tenant_applications.unit_id references rental_units(id) with ON DELETE CASCADE', () => {
    expect(migrationSql).toMatch(
      /unit_id\s+UUID\s+NOT NULL REFERENCES rental_units\(id\) ON DELETE CASCADE/,
    )
  })

  it('constrains tenant_applications.status to the four documented values', () => {
    expect(migrationSql).toMatch(/CHECK \(status IN \('new', 'reviewing', 'approved', 'rejected'\)\)/)
  })

  it('requires consent to be TRUE at the database layer (authoritative, not just zod)', () => {
    expect(migrationSql).toMatch(
      /consent\s+BOOLEAN\s+NOT NULL DEFAULT FALSE CHECK \(consent = TRUE\)/,
    )
  })

  it('constrains leases.status to draft/sent/signed, defaulting to draft', () => {
    expect(migrationSql).toMatch(
      /status\s+TEXT\s+NOT NULL DEFAULT 'draft' CHECK \(status IN \('draft', 'sent', 'signed'\)\)/,
    )
  })

  it('leases references rental_units, lease_templates, and tenant_applications', () => {
    expect(migrationSql).toMatch(/unit_id\s+UUID\s+NOT NULL REFERENCES rental_units\(id\) ON DELETE CASCADE/)
    expect(migrationSql).toMatch(/template_id\s+UUID\s+REFERENCES lease_templates\(id\) ON DELETE SET NULL/)
    expect(migrationSql).toMatch(
      /application_id\s+UUID\s+REFERENCES tenant_applications\(id\) ON DELETE SET NULL/,
    )
  })
})

describe('0015_landlord_screening_lease.sql — RLS is enabled on all three new tables', () => {
  it('enables RLS', () => {
    expect(migrationSql).toMatch(/ALTER TABLE tenant_applications ENABLE ROW LEVEL SECURITY/)
    expect(migrationSql).toMatch(/ALTER TABLE lease_templates\s+ENABLE ROW LEVEL SECURITY/)
    expect(migrationSql).toMatch(/ALTER TABLE leases\s+ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0015_landlord_screening_lease.sql — tenant_applications is owner-scoped through rental_units', () => {
  it('SELECT policy scopes through a subquery on rental_units.owner_id (no direct owner_id column)', () => {
    const match = migrationSql.match(
      /CREATE POLICY "tenant_applications: owner can select own"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('rental_units WHERE owner_id = auth.uid()')
  })

  it('UPDATE policy (Approve/Reject) is scoped the same way', () => {
    const match = migrationSql.match(
      /CREATE POLICY "tenant_applications: owner can update own"[\s\S]*?USING \(([\s\S]*?)\)\s*WITH CHECK/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('rental_units WHERE owner_id = auth.uid()')
  })

  it('has no public/anon INSERT policy — the public form writes via the service-role client only', () => {
    // The only INSERT policy present must be the owner-scoped one; there is
    // no separate "public"/"anon" INSERT policy on this table.
    const insertPolicies = migrationSql.match(/CREATE POLICY "tenant_applications:[^"]*"\s*\n\s*ON tenant_applications FOR INSERT/g) ?? []
    expect(insertPolicies).toHaveLength(1)
    expect(migrationSql).toMatch(/CREATE POLICY "tenant_applications: owner can insert own"/)
  })
})

describe('0015_landlord_screening_lease.sql — lease_templates is public read-only reference data', () => {
  it('has a public SELECT policy', () => {
    expect(migrationSql).toMatch(/CREATE POLICY "lease_templates: public can select"[\s\S]*?FOR SELECT USING \(true\)/)
  })

  it('has no INSERT/UPDATE/DELETE policy (service-role-only writes)', () => {
    const forbidden = /CREATE POLICY[^;]*lease_templates[^;]*FOR (INSERT|UPDATE|DELETE)/
    expect(migrationSql).not.toMatch(forbidden)
  })
})

describe('0015_landlord_screening_lease.sql — leases is strictly owner-scoped (same shape as rental_units)', () => {
  it('every policy checks auth.uid() = owner_id', () => {
    const policies = migrationSql.match(/CREATE POLICY "leases: owner can \w+ own"[\s\S]*?;/g) ?? []
    expect(policies.length).toBeGreaterThanOrEqual(4)
    for (const policy of policies) {
      expect(policy).toContain('auth.uid() = owner_id')
    }
  })
})

describe('0015_landlord_screening_lease.sql — seed data', () => {
  it('seeds exactly one English, long-term, Armenia template', () => {
    expect(migrationSql).toMatch(/INSERT INTO lease_templates \(country, lang, deal_type, name, body\)/)
    expect(migrationSql).toMatch(/SELECT 'AM', 'en', 'long_term'/)
  })

  it('guards the seed insert so re-running the migration does not duplicate rows', () => {
    expect(migrationSql).toMatch(
      /WHERE NOT EXISTS \(\s*SELECT 1 FROM lease_templates WHERE country = 'AM' AND lang = 'en' AND deal_type = 'long_term'\s*\)/,
    )
  })
})
