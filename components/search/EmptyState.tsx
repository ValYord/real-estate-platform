import { SearchX } from 'lucide-react'

interface EmptyStateProps {
  onClearFilters: () => void
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <SearchX className="w-16 h-16 text-gray-300 mb-4" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Nothing found</h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        No properties match your current filters. Try adjusting your search criteria.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Clear filters
        </button>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Expand area
        </button>
        <button
          className="px-4 py-2 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          🔔 Create alert
        </button>
      </div>
    </div>
  )
}
