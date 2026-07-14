/**
 * Static check for the Page 24 (Admin Panel MVP) Supabase migration
 * (supabase/migrations/0012_admin_moderation.sql), following the same
 * pattern as __tests__/virtualTourMigration.test.ts (no live Supabase
 * instance in CI to exercise RLS against).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0012_admin_moderation.sql'),
  'utf-8',
)

describe('0012_admin_moderation.sql — admin_actions table', () => {
  it('creates the admin_actions table with the documented audit-log columns', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS admin_actions/)
    expect(migrationSql).toMatch(/admin_id\s+UUID\s+NOT NULL REFERENCES profiles\(id\)/)
    expect(migrationSql).toMatch(/action\s+TEXT\s+NOT NULL/)
    expect(migrationSql).toMatch(/target_type\s+TEXT\s+NOT NULL/)
    expect(migrationSql).toMatch(/target_id\s+UUID\s+NOT NULL/)
    expect(migrationSql).toMatch(/meta\s+JSONB\s+NOT NULL DEFAULT '\{\}'/)
    expect(migrationSql).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT NULL DEFAULT NOW\(\)/)
  })

  it('constrains action to the two known audit events', () => {
    expect(migrationSql).toMatch(/CHECK \(action IN \('listing_approved', 'listing_rejected'\)\)/)
  })

  it('enables RLS on admin_actions', () => {
    expect(migrationSql).toMatch(/ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY/)
  })

  it('adds an admin-only SELECT policy (audit log read is admin-only per the task brief)', () => {
    expect(migrationSql).toMatch(/CREATE POLICY "admin_actions: admin can select"/)
  })

  it('adds an INSERT policy that requires admin_id = auth.uid() (no attributing actions to someone else)', () => {
    expect(migrationSql).toMatch(/CREATE POLICY "admin_actions: admin can insert own"/)
    expect(migrationSql).toMatch(/admin_id = auth\.uid\(\)/)
  })
})

describe('0012_admin_moderation.sql — properties.status extended with rejected', () => {
  it('drops and recreates the status CHECK constraint including the new rejected value', () => {
    expect(migrationSql).toMatch(/DROP CONSTRAINT IF EXISTS properties_status_check/)
    expect(migrationSql).toMatch(
      /CHECK \(status IN \('active', 'draft', 'pending', 'archived', 'sold', 'rejected'\)\)/,
    )
  })
})

describe('0012_admin_moderation.sql — is_admin() helper + admin RLS policies', () => {
  it('defines a SECURITY DEFINER is_admin() helper with a pinned search_path', () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION is_admin\(\)/)
    expect(migrationSql).toMatch(/SECURITY DEFINER/)
    expect(migrationSql).toMatch(/SET search_path = public/)
  })

  it('grants admins SELECT on all profiles (Dashboard users count + Moderation owner names)', () => {
    expect(migrationSql).toMatch(/CREATE POLICY "profiles: admin can select all"/)
  })

  it('grants admins SELECT and UPDATE on all properties (Moderation queue + approve\\/reject)', () => {
    expect(migrationSql).toMatch(/CREATE POLICY "properties: admin can select all"/)
    expect(migrationSql).toMatch(/CREATE POLICY "properties: admin can update all"/)
  })
})
