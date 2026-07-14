import { UserSearch } from 'lucide-react'

interface AgentsEmptyStateProps {
  hasActiveFilters: boolean
  onClearFilters: () => void
}

/**
 * Empty state for the `/agents` directory — docs/en/pages/11-find-agent.md §4.
 * "No agents match your filters" when filters are active, a softer message
 * otherwise (e.g. no agents at all in a freshly-seeded environment).
 */
export function AgentsEmptyState({ hasActiveFilters, onClearFilters }: AgentsEmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center py-20 px-4 text-center text-gray-500">
      <UserSearch className="w-16 h-16 text-gray-300 mb-4" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {hasActiveFilters ? 'No agents match your filters' : 'No agents found'}
      </h2>
      <p className="mb-6 max-w-sm">
        {hasActiveFilters
          ? 'Try adjusting your city, specialty, language, or rating filters.'
          : 'There are no agents to show right now. Please check back later.'}
      </p>
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
