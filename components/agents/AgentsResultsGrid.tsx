'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentCard } from './AgentCard'
import { AgentsEmptyState } from './AgentsEmptyState'
import { agentsQueryToParams } from '@/lib/agent/schemas'
import type { AgentsQueryInput } from '@/lib/agent/schemas'
import type { AgentsListResponse } from '@/lib/agent/types'

interface AgentsResultsGridProps {
  filters: AgentsQueryInput
  initialData: AgentsListResponse
  onPageChange: (page: number) => void
  onClearFilters: () => void
}

async function fetchAgents(filters: AgentsQueryInput): Promise<AgentsListResponse> {
  const params = agentsQueryToParams(filters)
  const res = await fetch(`/api/agents?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch agents')
  return res.json() as Promise<AgentsListResponse>
}

function SkeletonCard() {
  return <div className="bg-gray-100 animate-pulse rounded-xl h-56" aria-hidden="true" />
}

/**
 * Results grid for the `/agents` directory — docs/en/pages/11-find-agent.md
 * §3.5. Client component: React Query keeps the grid in sync with the URL
 * (`initialData` from SSR hydrates the first paint, so there's no
 * loading flash on first load). Renders the loading skeleton, the agent
 * card grid, an empty state, or a fetch-error state.
 */
export function AgentsResultsGrid({
  filters,
  initialData,
  onPageChange,
  onClearFilters,
}: AgentsResultsGridProps) {
  const queryKey = ['agents', agentsQueryToParams(filters).toString()]

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAgents(filters),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })

  const hasActiveFilters = Boolean(
    filters.city || filters.specialty || filters.lang || filters.minRating !== undefined,
  )

  if (isError) {
    return (
      <div role="alert" className="text-center py-16 text-gray-500">
        <p className="mb-4">Something went wrong loading agents.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    )
  }

  const { items, total, page, pageSize } = data
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showSkeletons = isFetching && items.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {isFetching && !showSkeletons ? 'Updating…' : `${total} agent${total === 1 ? '' : 's'}`}
        </p>
      </div>

      {!isFetching && items.length === 0 ? (
        <AgentsEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={onClearFilters} />
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-200',
            isFetching && !showSkeletons && 'opacity-60',
          )}
        >
          {showSkeletons
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : items.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2 py-8">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-sm text-gray-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* SR-only loading announcement */}
      {isFetching && (
        <div className="sr-only" role="status" aria-live="polite">
          Loading agents…
        </div>
      )}
    </div>
  )
}
