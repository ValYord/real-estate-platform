import { Scale } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * "0 properties selected" state — reuses the icon-circle empty-state pattern
 * from app/[locale]/property/[id]/[slug]/not-found.tsx.
 */
export function CompareEmptyState() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div
        className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-8"
        aria-hidden="true"
      >
        <Scale className="w-14 h-14 text-gray-300" />
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-3">
        No properties selected to compare
      </h1>
      <p className="text-gray-500 mb-8">
        Select properties from search results using the &ldquo;⚖ Compare&rdquo; checkbox on
        each card.
      </p>

      <Link
        href="/search"
        className="flex items-center justify-center gap-2 h-12 px-6 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Search properties
      </Link>
    </div>
  )
}
