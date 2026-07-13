'use client'

import { cn } from '@/lib/utils'

interface NewMatchBadgeProps {
  count: number
}

/**
 * "N new" badge on a saved-search card.
 * count > 0 → primary pill; count === 0 → gray pill.
 */
export default function NewMatchBadge({ count }: NewMatchBadgeProps) {
  return (
    <span
      aria-label={`${count} new matching ${count === 1 ? 'property' : 'properties'}`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
        count > 0
          ? 'bg-primary text-white font-semibold'
          : 'bg-gray-100 text-gray-400',
      )}
    >
      {count} new
    </span>
  )
}
