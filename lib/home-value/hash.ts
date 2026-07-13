import 'server-only'
import { randomBytes } from 'node:crypto'

/**
 * Generates a short, URL-safe, unguessable id for a new estimate snapshot
 * (e.g. `e8423ab...`), used as the shareable `/home-value/[estimateHash]`
 * path segment.
 *
 * This is a bearer capability token, not a database primary key: RLS on
 * `home_value_estimates` does not grant public SELECT, so anyone who knows
 * the hash can read that one snapshot only via `GET /api/home-value/[hash]`
 * (service-role client, scoped by an exact-match query) — see the migration
 * file for the full rationale. 9 random bytes → 12 base64url characters,
 * comparable entropy to the HMAC-token pattern in
 * lib/saved-searches/unsubscribeToken.ts.
 */
export function generateEstimateHash(): string {
  return randomBytes(9).toString('base64url')
}
