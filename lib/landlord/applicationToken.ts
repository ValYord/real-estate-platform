import 'server-only'
import { randomBytes } from 'node:crypto'

/**
 * Generates an unguessable, URL-safe bearer token for a unit's public
 * "shareable application link" (`/apply/[token]`, docs/en/pages/19-landlord.md
 * §3.3). Same entropy/shape reasoning as lib/home-value/hash.ts — 12 random
 * bytes → 24 hex characters. Normally every `rental_units` row already has
 * one from the column's DB-side default (see
 * supabase/migrations/0015_landlord_screening_lease.sql); this is only used
 * to lazily backfill a row where it's somehow still null.
 */
export function generateApplyToken(): string {
  return randomBytes(12).toString('hex')
}
