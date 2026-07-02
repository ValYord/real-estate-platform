'use client'

import { PropertyCard } from './PropertyCard'
import { EmptyState } from './EmptyState'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Filters } from '@/lib/search/filtersSchema'
import type { PropertiesResponse } from '@/lib/search/types'

interface ListingsPanelProps {
  /** Live data from the parent's React Query — always up-to-date. */
  data: PropertiesResponse
  isFetching: boolean
  filters: Filters
  hoveredId: string | null
  onCardHover: (id: string | null) => void
  onPageChange: (page: number) => void
  onClearFilters: () => void
}

function SkeletonCard() {
  return (
    <div className="bg-gray-100 animate-pulse rounded-xl h-72" aria-hidden="true" />
  )
}

export function ListingsPanel({
  data,
  isFetching,
  hoveredId,
  onCardHover,
  onPageChange,
  onClearFilters,
}: ListingsPanelProps) {
  const { items, page, totalPages } = data

  // Show empty state only when not loading
  if (!isFetching && items.length === 0) {
    return <EmptyState onClearFilters={onClearFilters} />
  }

  const pageNumbers = buildPageNumbers(page, totalPages)

  return (
    <div className="flex flex-col">
      {/* Grid — dim while re-fetching, show skeletons on first load */}
      <div
        className={cn(
          'grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 transition-opacity duration-200',
          isFetching && 'opacity-60',
        )}
      >
        {isFetching && items.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : items.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isHighlighted={hoveredId === property.id}
                onHover={onCardHover}
              />
            ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-1 py-6"
        >
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              page <= 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          {pageNumbers.map((n, i) =>
            n === '…' ? (
              <span
                key={`ellipsis-${i}`}
                className="w-9 h-9 flex items-center justify-center text-gray-400"
              >
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => onPageChange(Number(n))}
                aria-label={`Page ${n}`}
                aria-current={Number(n) === page ? 'page' : undefined}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  Number(n) === page
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {n}
              </button>
            ),
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              page >= totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* SR-only loading announcement */}
      {isFetching && (
        <div className="sr-only" role="status" aria-live="polite">
          Loading properties…
        </div>
      )}
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}
