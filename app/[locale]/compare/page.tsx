import type { Metadata } from 'next'
import { parseCompareIds } from '@/lib/compare/schemas'
import { ComparePageClient } from '@/components/compare/ComparePageClient'

type ComparePageSearchParams = Promise<Record<string, string | string[] | undefined>>

// `/compare` is always noindex for MVP — the page is either empty/dynamic
// (personal selection) or a table of specific listings, neither of which is
// an indexable marketing landing (see docs/design/25-compare-handoff.md D3).
export const metadata: Metadata = {
  title: 'Compare properties | RE Platform',
  robots: { index: false, follow: false },
}

/**
 * Server shell: validates the `ids` query param at the boundary (never
 * crashes on malformed input — see lib/compare/schemas.ts) and hands the
 * parsed list to the client component, which owns the data fetch and all
 * interactive state.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: ComparePageSearchParams
}) {
  const sp = await searchParams
  const raw = typeof sp.ids === 'string' ? sp.ids : undefined
  const ids = parseCompareIds(raw)

  return <ComparePageClient initialIds={ids} />
}
