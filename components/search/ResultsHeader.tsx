'use client'

import type { Filters } from '@/lib/search/filtersSchema'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultsHeaderProps {
  total: number
  filters: Filters
  isLoading: boolean
  onRemoveFilter: (key: keyof Filters) => void
  onClearAll: () => void
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `${Math.round(price / 1_000_000)}M`
  if (price >= 1_000) return `${Math.round(price / 1_000)}K`
  return String(price)
}

interface Chip {
  key: keyof Filters
  label: string
}

function buildChips(filters: Filters): Chip[] {
  const chips: Chip[] = []
  if (filters.priceMin) chips.push({ key: 'priceMin', label: `From ${formatPrice(filters.priceMin)} ֏` })
  if (filters.priceMax) chips.push({ key: 'priceMax', label: `Up to ${formatPrice(filters.priceMax)} ֏` })
  if (filters.beds) chips.push({ key: 'beds', label: `${filters.beds}+ beds` })
  if (filters.baths) chips.push({ key: 'baths', label: `${filters.baths}+ baths` })
  if (filters.areaMin) chips.push({ key: 'areaMin', label: `${filters.areaMin}+ m²` })
  return chips
}

export function ResultsHeader({
  total,
  filters,
  isLoading,
  onRemoveFilter,
  onClearAll,
}: ResultsHeaderProps) {
  const chips = buildChips(filters)
  const hasActiveFilters = chips.length > 0 || (filters.type && filters.type.length > 0)

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p
          role="status"
          aria-live="polite"
          className="text-lg font-semibold text-gray-900"
        >
          {isLoading ? (
            <span className="inline-block w-24 h-5 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              {total.toLocaleString()} propert{total === 1 ? 'y' : 'ies'}
              {filters.deal === 'sale' ? ' for sale' : ' for rent'}
              {filters.city ? ` in ${filters.city}` : ''}
            </>
          )}
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Clear all
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="bg-gray-100 text-gray-700 text-sm rounded-full px-3 py-1 inline-flex items-center gap-1"
            >
              {chip.label}
              <button
                onClick={() => onRemoveFilter(chip.key)}
                aria-label={`Remove filter: ${chip.label}`}
                className={cn(
                  'ml-0.5 rounded-full p-0.5 hover:bg-gray-200 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                )}
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
