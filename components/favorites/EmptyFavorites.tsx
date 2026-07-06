'use client'

import { Heart } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Empty state shown when the user has no saved favorites.
 */
export default function EmptyFavorites() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      {/* Empty heart illustration */}
      <Heart
        className="w-32 h-32 text-gray-300 mx-auto mb-6"
        aria-hidden="true"
        strokeWidth={1}
      />

      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        You haven&apos;t saved anything yet
      </h2>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        Tap ♡ on any property to save it here.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Link
          href="/search"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Search properties
        </Link>
        <Link
          href="/saved-searches"
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Create a saved search
        </Link>
      </div>
    </div>
  )
}
