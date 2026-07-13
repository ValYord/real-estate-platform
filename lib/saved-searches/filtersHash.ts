import type { Filters } from '@/lib/search/filtersSchema'

/**
 * Stable, order-independent serialization of a Filters object.
 * Object keys are sorted; the `type` array is sorted too, so filters that
 * are semantically identical but built up in a different order still
 * produce the same string.
 */
function stableStringify(filters: Filters): string {
  const normalized: Record<string, unknown> = {}
  const keys = (Object.keys(filters) as (keyof Filters)[]).sort()

  for (const key of keys) {
    const value = filters[key]
    if (value === undefined) continue
    normalized[key] = Array.isArray(value) ? [...value].sort() : value
  }

  return JSON.stringify(normalized)
}

/**
 * Deterministic client-side hash of a Filters object, used by
 * `<SaveSearchModal>` for the "already saved?" pre-check (comparing the
 * current filters against the searches already loaded from
 * `GET /api/saved-searches`).
 *
 * This is a lightweight nice-to-have, NOT the source of truth for dedupe —
 * the database's `UNIQUE (user_id, filters_hash)` index (computed with
 * Postgres's own `md5(filters::text)`) is authoritative and race-safe. The
 * two hashes do not need to match each other; both only need to be
 * deterministic for equal inputs.
 *
 * Pure JS (no Node built-ins) so it is safe to import from client components.
 */
export function filtersHash(filters: Filters): string {
  const str = stableStringify(filters)

  // FNV-1a (32-bit) — fast, deterministic, dependency-free.
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16)
}
