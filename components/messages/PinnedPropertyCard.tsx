'use client'

import Image from 'next/image'
import { Home, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { ConversationProperty } from '@/lib/messages/types'

function formatPrice(price: number, currency: string): string {
  const symbol =
    currency === 'AMD' ? '֏' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'
  return currency === 'AMD'
    ? `${Math.round((price / 1_000_000) * 10) / 10}M ${symbol}`
    : `${symbol}${price.toLocaleString()}`
}

interface PinnedPropertyCardProps {
  property: ConversationProperty | null
}

/**
 * Sticky pinned property card at the top of the thread — keeps the property
 * context in view. Handles the "sold/deleted" edge cases from doc §3.2.
 */
export default function PinnedPropertyCard({ property }: PinnedPropertyCardProps) {
  if (!property) {
    return (
      <div className="sticky top-0 bg-white border-b p-3 z-10 flex-shrink-0">
        <p className="text-sm text-gray-400 italic">Property removed</p>
      </div>
    )
  }

  const inactive = property.status === 'sold' || property.status === 'pending'

  return (
    <div className="sticky top-0 bg-white border-b z-10 flex-shrink-0">
      <Link
        href={`/property/${property.id}`}
        className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
          {property.thumb ? (
            <Image
              src={property.thumb}
              alt=""
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home className="w-5 h-5 text-gray-300" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {formatPrice(property.price, property.currency)}
          </p>
          <p className="text-xs text-gray-500 truncate">{property.title}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" aria-hidden="true" />
      </Link>
      {inactive && (
        <p className="px-3 pb-2 text-xs text-amber-600">
          This property is {property.status === 'sold' ? 'sold' : 'reserved'}
        </p>
      )}
    </div>
  )
}
