'use client'

import { Bell } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Empty state shown when the user has no saved searches.
 * Mirrors `components/favorites/EmptyFavorites.tsx`.
 */
export default function EmptySavedSearches() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <Bell
        className="w-32 h-32 text-gray-300 mx-auto mb-6"
        aria-hidden="true"
        strokeWidth={1}
      />

      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        You don&apos;t have any saved searches yet
      </h2>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        Search for a property, apply filters, and tap &ldquo;Save search&rdquo; to learn about new offers.
      </p>

      <Link
        href="/search"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Start a search
      </Link>
    </div>
  )
}
