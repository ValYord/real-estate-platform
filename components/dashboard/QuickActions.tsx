'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { Plus, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  listingCount: number
  maxFreeListings?: number
}

export default function QuickActions({
  listingCount,
  maxFreeListings = 5,
}: QuickActionsProps) {
  const limitReached = listingCount >= maxFreeListings
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="flex flex-wrap gap-3">
      {/* Add listing button */}
      <div className="relative">
        {limitReached ? (
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className={cn(
              'inline-flex items-center gap-2 h-11 rounded-lg px-4 font-medium text-sm',
              'bg-primary text-white opacity-70 cursor-not-allowed',
            )}
            aria-describedby="upsell-tooltip"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            Add listing
          </button>
        ) : (
          <Link
            href="/sell/new"
            className={cn(
              'inline-flex items-center gap-2 h-11 rounded-lg px-4 font-medium text-sm',
              'bg-primary text-white hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            )}
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            Add listing
          </Link>
        )}

        {limitReached && showTooltip && (
          <div
            id="upsell-tooltip"
            role="tooltip"
            className="absolute left-0 top-full mt-2 z-10 w-56 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-lg"
          >
            You&apos;ve reached the free limit. Switch to Pro to post more listings.
            <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        )}
      </div>

      {/* Edit profile */}
      <Link
        href="/settings"
        className={cn(
          'inline-flex items-center gap-2 h-11 rounded-lg px-4 font-medium text-sm',
          'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <Edit3 aria-hidden="true" className="w-4 h-4" />
        Edit profile
      </Link>
    </div>
  )
}
