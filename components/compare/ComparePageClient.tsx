'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@/i18n/navigation'
import { useCompareStore } from '@/store/compareStore'
import { MAX_COMPARE } from '@/lib/compare/schemas'
import { deriveCompareState } from '@/lib/compare/state'
import type { CompareProperty, ComparePropertiesResponse } from '@/lib/compare/types'
import { CompareTable } from './CompareTable'
import { CompareEmptyState } from './CompareEmptyState'

interface ComparePageClientProps {
  /** Ids parsed & validated server-side from the `?ids=` query param. */
  initialIds: string[]
}

async function fetchComparedProperties(ids: string[]): Promise<ComparePropertiesResponse> {
  const res = await fetch(`/api/properties?ids=${ids.join(',')}`)
  if (!res.ok) throw new Error('Failed to fetch compared properties')
  return res.json() as Promise<ComparePropertiesResponse>
}

function Breadcrumbs() {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
        <li>
          <Link
            href="/"
            className="hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="select-none">›</li>
        <li>
          <span className="text-gray-900 font-medium">Compare</span>
        </li>
      </ol>
      <Link
        href="/"
        className="sm:hidden inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        <span aria-hidden="true">‹</span>
        Back
      </Link>
    </nav>
  )
}

/**
 * Client shell for `/compare`. Owns the react-query fetch keyed by ids and
 * renders one of: empty / under-minimum / loading / error / the full table.
 *
 * On mount, a shared/deep-linked URL's `ids` become the source of truth for
 * the client-side compare store (overwriting stale localStorage state) — see
 * store/compareStore.ts and docs/design/25-compare-handoff.md §6.
 */
export function ComparePageClient({ initialIds }: ComparePageClientProps) {
  const router = useRouter()
  const storeIds = useCompareStore((s) => s.ids)
  const setIds = useCompareStore((s) => s.setIds)
  const remove = useCompareStore((s) => s.remove)

  useEffect(() => {
    setIds(initialIds)
    // Only on mount — a direct/shared navigation to /compare?ids=... should win
    // over whatever was previously in localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ids = storeIds
  const viewState = deriveCompareState(ids)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['compare', ids],
    queryFn: () => fetchComparedProperties(ids),
    enabled: viewState === 'ready',
    staleTime: 30 * 1000,
  })

  const properties: CompareProperty[] = useMemo(() => data?.items ?? [], [data])

  const handleRemove = (id: string) => {
    remove(id)
    const next = ids.filter((x) => x !== id)
    router.replace(next.length > 0 ? `/compare?ids=${next.join(',')}` : '/compare', { scroll: false })
  }

  if (viewState === 'empty') {
    return <CompareEmptyState />
  }

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <Breadcrumbs />

      <h1 className="text-2xl font-semibold text-gray-900">
        Compare
        <span className="text-base text-gray-500 font-normal ml-2">
          {ids.length}/{MAX_COMPARE}
        </span>
      </h1>

      {viewState === 'under-minimum' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-8 gap-3 text-sm text-gray-500 max-w-sm">
            <p>Add at least 2 properties to compare.</p>
            <Link
              href="/search"
              className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Search properties →
            </Link>
          </div>
        </div>
      )}

      {viewState === 'ready' && isLoading && (
        <div
          role="status"
          aria-label="Loading comparison"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {ids.map((id) => (
            <div key={id} className="bg-gray-100 animate-pulse rounded-xl h-64" aria-hidden="true" />
          ))}
        </div>
      )}

      {viewState === 'ready' && isError && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <p className="text-gray-500 text-sm">Something went wrong</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Try again
          </button>
        </div>
      )}

      {viewState === 'ready' && !isLoading && !isError && properties.length > 0 && (
        <CompareTable properties={properties} onRemove={handleRemove} />
      )}
    </main>
  )
}
