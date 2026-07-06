'use client'

import Image from 'next/image'
import { Heart, BedDouble, Bath, Maximize, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from '@/i18n/navigation'
import PriceDropChip from './PriceDropChip'
import type { FavoriteItem } from '@/lib/favorites/types'

interface FavoriteCardProps {
  item: FavoriteItem
  isFading: boolean
  onRemove: (propertyId: string) => void
}

function formatPrice(price: number, currency: string, dealType: string): string {
  const symbol =
    currency === 'AMD' ? '֏' :
    currency === 'USD' ? '$' :
    currency === 'EUR' ? '€' : '₽'
  const fmt =
    currency === 'AMD'
      ? `${Math.round((price / 1_000_000) * 10) / 10}M ${symbol}`
      : `${symbol}${price.toLocaleString()}`
  return dealType === 'rent' ? `${fmt}/mo` : fmt
}

const UNAVAILABLE_STATUSES = new Set<string>(['sold', 'rented'])
const ARCHIVED_STATUSES = new Set<string>(['archived'])

/**
 * A single card in the Favorites grid.
 *
 * Handles:
 * - Price-drop / price-up chip
 * - "Reserved" amber badge (status = pending)
 * - Grayscale overlay + "No longer available" for sold/rented
 * - Placeholder card for archived/deleted properties
 * - ♡ toggle (filled, aria-pressed) with optimistic fade-out
 */
export default function FavoriteCard({ item, isFading, onRemove }: FavoriteCardProps) {
  const coverUrl = item.media[0]?.url ?? null
  const isUnavailable = UNAVAILABLE_STATUSES.has(item.status)
  const isArchived = ARCHIVED_STATUSES.has(item.status)

  const title =
    item.title['en'] ??
    item.title['hy'] ??
    item.title[Object.keys(item.title)[0]] ??
    'Property'

  const similarHref =
    `/search?deal_type=${item.dealType}&city=${encodeURIComponent(item.city)}` +
    `&property_type=${item.propertyType}` as Parameters<typeof Link>[0]['href']

  // Archived / deleted placeholder card
  if (isArchived) {
    return (
      <li
        className={cn(
          'bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity duration-200',
          isFading ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div className="p-4 flex flex-col items-center justify-center text-center h-48 gap-4">
          <p className="text-sm text-gray-500">Removed from listings</p>
          <button
            type="button"
            onClick={() => onRemove(item.propertyId)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Remove
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
        'transition-all duration-200',
        'hover:shadow-md hover:scale-[1.01]',
        isFading ? 'opacity-0' : 'opacity-100',
        isUnavailable && 'grayscale opacity-60',
      )}
    >
      <Link
        href={`/property/${item.propertyId}/${item.slug}` as Parameters<typeof Link>[0]['href']}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.click()
        }}
      >
        {/* Photo area */}
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Maximize className="w-12 h-12" aria-hidden="true" />
            </div>
          )}

          {/* Unavailable overlay */}
          {isUnavailable && (
            <div
              role="status"
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
            >
              <span className="text-white font-semibold text-sm px-3 py-1.5 bg-black/60 rounded-lg">
                No longer available
              </span>
            </div>
          )}

          {/* Reserved badge */}
          {item.status === 'pending' && (
            <div className="absolute top-3 left-3">
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-md font-medium">
                Reserved
              </span>
            </div>
          )}

          {/* Price-change chip */}
          {item.priceChangePct !== null && (
            <div className="absolute bottom-3 left-3">
              <PriceDropChip priceChangePct={item.priceChangePct} />
            </div>
          )}

          {/* ♡ remove button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove(item.propertyId)
            }}
            aria-label="Remove from favorites"
            aria-pressed="true"
            className={cn(
              'absolute top-3 right-3 min-w-[2.75rem] min-h-[2.75rem] w-11 h-11',
              'rounded-full flex items-center justify-center shadow transition-colors',
              'bg-white/90 text-red-500 hover:bg-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <Heart
              className="w-5 h-5 text-red-500 fill-red-500"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Card body */}
        <div className="p-3">
          <p className="text-lg font-bold text-gray-900">
            {formatPrice(item.price, item.currency, item.dealType)}
          </p>

          {/* Key facts */}
          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-600 flex-wrap">
            {item.bedrooms !== null && (
              <span className="flex items-center gap-1">
                <BedDouble className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {item.bedrooms}
              </span>
            )}
            {item.bathrooms !== null && (
              <span className="flex items-center gap-1">
                <Bath className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {item.bathrooms}
              </span>
            )}
            {item.area !== null && (
              <span className="flex items-center gap-1">
                <Maximize className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {item.area} m²
              </span>
            )}
            {item.floor !== null && item.floorsTotal !== null && (
              <span className="text-gray-400 text-xs">
                fl. {item.floor}/{item.floorsTotal}
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-sm text-gray-500 mt-1.5 truncate">
            {[item.district, item.city].filter(Boolean).join(', ')}
          </p>
        </div>
      </Link>

      {/* Unavailable actions (outside the Link to prevent navigation) */}
      {isUnavailable && (
        <div className="px-3 pb-3 flex gap-2">
          <button
            type="button"
            onClick={() => onRemove(item.propertyId)}
            className="flex-1 text-xs rounded-lg border border-gray-200 py-2 text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Remove
          </button>
          <Link
            href={similarHref}
            className="flex-1 text-xs rounded-lg bg-primary/10 py-2 text-primary text-center hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={(e) => e.stopPropagation()}
          >
            View similar
          </Link>
        </div>
      )}
    </li>
  )
}
