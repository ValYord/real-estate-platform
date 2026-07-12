'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SPECIALTY_OPTIONS,
  SPECIALTY_LABEL,
  LANGUAGE_OPTIONS,
  LANGUAGE_LABEL,
  MIN_RATING_OPTIONS,
  SORT_LABEL,
} from '@/lib/agent/constants'
import type { AgentsQueryInput } from '@/lib/agent/schemas'
import { AGENTS_SORT_OPTIONS, type AgentsSort } from '@/lib/agent/types'

interface AgentsFilterBarProps {
  filters: AgentsQueryInput
  onFiltersChange: (updates: Partial<AgentsQueryInput>) => void
  onClear: () => void
}

/** Small toggle-button group shared by the language and rating filters. */
function ToggleGroup<T extends string | number>({
  legend,
  options,
  labelFor,
  value,
  onSelect,
}: {
  legend: string
  options: readonly T[]
  labelFor: (v: T) => string
  value: T | undefined
  onSelect: (v: T | undefined) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-gray-700 mb-1">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          aria-pressed={value === undefined}
          className={cn(
            'h-9 px-3 rounded-md text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            value === undefined
              ? 'bg-primary text-white border-primary'
              : 'border-gray-300 text-gray-700 hover:border-gray-400',
          )}
        >
          Any
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            aria-pressed={value === opt}
            className={cn(
              'h-9 px-3 rounded-md text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              value === opt
                ? 'bg-primary text-white border-primary'
                : 'border-gray-300 text-gray-700 hover:border-gray-400',
            )}
          >
            {labelFor(opt)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * Filter/sort bar for the `/agents` directory — docs/en/pages/11-find-agent.md
 * §3.3–3.4. Every change updates the URL (via the parent's onFiltersChange →
 * router.push) so filtering is shareable/bookmarkable. Client component
 * (interactive, URL-synced).
 */
export function AgentsFilterBar({ filters, onFiltersChange, onClear }: AgentsFilterBarProps) {
  const [cityValue, setCityValue] = useState(filters.city ?? '')
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the local input in sync when filters are cleared/changed externally
  // (e.g. browser back/forward navigation).
  useEffect(() => {
    setCityValue(filters.city ?? '')
  }, [filters.city])

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setCityValue(next)
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(() => {
      onFiltersChange({ city: next.trim() || undefined, page: 1 })
    }, 400)
  }

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (commitTimer.current) clearTimeout(commitTimer.current)
      onFiltersChange({ city: cityValue.trim() || undefined, page: 1 })
    }
  }

  const hasActiveFilters = Boolean(
    filters.city || filters.specialty || filters.lang || filters.minRating !== undefined,
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
      {/* City */}
      <div className="flex flex-col gap-1">
        <label htmlFor="agents-city" className="text-sm font-medium text-gray-700">
          City
        </label>
        <input
          id="agents-city"
          type="text"
          value={cityValue}
          onChange={handleCityChange}
          onKeyDown={handleCityKeyDown}
          placeholder="Any city"
          className="h-9 w-40 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Specialty */}
      <div className="flex flex-col gap-1">
        <label htmlFor="agents-specialty" className="text-sm font-medium text-gray-700">
          Specialty
        </label>
        <select
          id="agents-specialty"
          value={filters.specialty ?? ''}
          onChange={(e) => onFiltersChange({ specialty: e.target.value || undefined, page: 1 })}
          className="h-9 border border-gray-300 rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Any specialty</option>
          {SPECIALTY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SPECIALTY_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Language */}
      <ToggleGroup
        legend="Language"
        options={LANGUAGE_OPTIONS}
        labelFor={(lang) => LANGUAGE_LABEL[lang] ?? lang}
        value={filters.lang as (typeof LANGUAGE_OPTIONS)[number] | undefined}
        onSelect={(lang) => onFiltersChange({ lang, page: 1 })}
      />

      {/* Rating */}
      <ToggleGroup
        legend="Minimum rating"
        options={MIN_RATING_OPTIONS}
        labelFor={(r) => `⭐ ${r}+`}
        value={filters.minRating as (typeof MIN_RATING_OPTIONS)[number] | undefined}
        onSelect={(minRating) => onFiltersChange({ minRating, page: 1 })}
      />

      <div className="flex-1" />

      {/* Sort */}
      <div className="flex flex-col gap-1">
        <label htmlFor="agents-sort" className="text-sm font-medium text-gray-700">
          Sort
        </label>
        <select
          id="agents-sort"
          value={filters.sort}
          onChange={(e) => onFiltersChange({ sort: e.target.value as AgentsSort, page: 1 })}
          className="h-9 border border-gray-300 rounded-md px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Sort agents"
        >
          {AGENTS_SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="h-9 px-3 flex items-center gap-1 text-sm text-gray-600 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  )
}
