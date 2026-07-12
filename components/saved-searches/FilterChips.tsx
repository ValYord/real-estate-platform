'use client'

import { useState } from 'react'
import { buildFilterChips } from '@/lib/saved-searches/filterLabels'
import type { Filters } from '@/lib/search/filtersSchema'

interface FilterChipsProps {
  filters: Filters
}

/**
 * Renders the filter-summary chip row for a saved search — same label
 * vocabulary as `FilterBar` (see `lib/saved-searches/filterLabels.ts`) so a
 * saved search reads identically to how the filter bar displayed it.
 * Caps at 5 visible chips; the rest expand behind a "+N filters" chip.
 */
export default function FilterChips({ filters }: FilterChipsProps) {
  const [expanded, setExpanded] = useState(false)
  const { visible, overflow } = buildFilterChips(filters)

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((chip) => (
        <span
          key={chip.key}
          className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full"
        >
          {chip.label}
        </span>
      ))}

      {overflow.length > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          +{overflow.length} filters
        </button>
      )}

      {expanded &&
        overflow.map((chip) => (
          <span
            key={chip.key}
            className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full"
          >
            {chip.label}
          </span>
        ))}
    </div>
  )
}
