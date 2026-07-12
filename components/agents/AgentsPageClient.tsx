'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { AgentsFilterBar } from './AgentsFilterBar'
import { AgentsResultsGrid } from './AgentsResultsGrid'
import { agentsQueryToParams } from '@/lib/agent/schemas'
import type { AgentsQueryInput } from '@/lib/agent/schemas'
import type { AgentsListResponse } from '@/lib/agent/types'

interface AgentsPageClientProps {
  initialData: AgentsListResponse
  initialFilters: AgentsQueryInput
}

/**
 * Client-side controller for `/agents` — owns the filter/sort/page state,
 * keeps the URL in sync (shareable/bookmarkable, SSR reads it on reload),
 * and renders the filter bar + results grid.
 * docs/en/pages/11-find-agent.md §5 component tree.
 */
export function AgentsPageClient({ initialData, initialFilters }: AgentsPageClientProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filters, setFilters] = useState<AgentsQueryInput>(initialFilters)

  const pushFilters = useCallback(
    (next: AgentsQueryInput) => {
      const qs = agentsQueryToParams(next).toString()
      startTransition(() => {
        router.push(qs ? `/agents?${qs}` : '/agents', { scroll: false })
      })
    },
    [router],
  )

  const handleFiltersChange = useCallback(
    (updates: Partial<AgentsQueryInput>) => {
      const next = { ...filters, ...updates }
      setFilters(next)
      pushFilters(next)
    },
    [filters, pushFilters],
  )

  const handleClear = useCallback(() => {
    const next: AgentsQueryInput = { sort: 'rating', page: 1 }
    setFilters(next)
    pushFilters(next)
  }, [pushFilters])

  const handlePageChange = useCallback(
    (page: number) => {
      handleFiltersChange({ page })
    },
    [handleFiltersChange],
  )

  return (
    <div className="flex flex-col gap-6">
      <AgentsFilterBar filters={filters} onFiltersChange={handleFiltersChange} onClear={handleClear} />
      <AgentsResultsGrid
        filters={filters}
        initialData={initialData}
        onPageChange={handlePageChange}
        onClearFilters={handleClear}
      />
    </div>
  )
}
