import { z } from 'zod'

/** Maximum number of properties that can be compared side by side. */
export const MAX_COMPARE = 4
/** Minimum number of properties required to render the comparison table. */
export const MIN_COMPARE = 2

/**
 * Property ids in this codebase are UUIDs in production
 * (`types/database.ts` / `supabase/migrations`) but plain short strings
 * ('1', 'm1', ...) in the mock/dev-fallback seed data (see
 * `lib/search/mockData.ts`). Validate a safe token shape, not a strict UUID —
 * Supabase's `.in()` is parameterized regardless, so this is only about
 * rejecting garbage input gracefully (empty, whitespace, oversized, exotic
 * characters), not about format purity.
 */
const idToken = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9-]+$/)

/**
 * Parses a raw `?ids=` query value into a deduped, capped list of valid ids.
 * Never throws: malformed tokens are dropped, duplicates are dropped, and if
 * more than MAX_COMPARE valid ids remain only the first MAX_COMPARE (in
 * encounter order) are kept — "reject gracefully," per the acceptance
 * criteria, not a 400.
 */
export function parseCompareIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const token of raw.split(',')) {
    if (seen.size >= MAX_COMPARE) break
    const result = idToken.safeParse(token)
    if (result.success) seen.add(result.data)
  }
  return Array.from(seen)
}
