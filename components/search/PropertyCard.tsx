'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import { Heart, ChevronLeft, ChevronRight, BedDouble, Bath, Maximize } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyListItem } from '@/lib/search/types'
import { Link } from '@/i18n/navigation'

interface PropertyCardProps {
  property: PropertyListItem
  isHighlighted?: boolean
  onHover?: (id: string | null) => void
}

const BADGE_STYLES: Record<string, string> = {
  new: 'bg-green-100 text-green-700',
  reduced: 'bg-orange-100 text-orange-700',
  featured: 'bg-amber-100 text-amber-700',
  sold: 'bg-gray-100 text-gray-600',
}

function formatPrice(price: number, currency: string, dealType: string): string {
  const symbol = currency === 'AMD' ? '֏' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'
  const fmt =
    currency === 'AMD'
      ? `${Math.round(price / 1_000_000 * 10) / 10}M ${symbol}`
      : `${symbol}${price.toLocaleString()}`
  return dealType === 'rent' ? `${fmt}/mo` : fmt
}

export function PropertyCard({ property, isHighlighted, onHover }: PropertyCardProps) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [isFav, setIsFav] = useState(property.isFavorited)
  const [isHovered, setIsHovered] = useState(false)

  const photos = property.cover ? [property.cover] : []
  const hasSold = property.badges.includes('sold')

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHover?.(property.id)
  }, [property.id, onHover])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHover?.(null)
  }, [onHover])

  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPhotoIdx((i) => (i + 1) % photos.length)
  }

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)
  }

  const toggleFav = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFav((f) => !f)
  }

  const title = property.title['en'] ?? property.title['hy'] ?? property.title[Object.keys(property.title)[0]] ?? 'Property'

  return (
    <article
      className={cn(
        'bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md',
        isHighlighted && 'ring-2 ring-primary shadow-md',
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/property/${property.id}/${property.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label={title}
      >
        {/* Photo area */}
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {photos.length > 0 ? (
            <Image
              src={photos[photoIdx]}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Maximize className="w-12 h-12" />
            </div>
          )}

          {/* SOLD overlay */}
          {hasSold && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <span className="text-white font-bold text-xl uppercase tracking-wider">SOLD</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {property.badges.filter((b) => b !== 'sold').map((badge) => (
              <span
                key={badge}
                className={cn('text-xs font-semibold uppercase px-2 py-0.5 rounded', BADGE_STYLES[badge])}
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Photo nav arrows (show on hover) */}
          {photos.length > 1 && isHovered && (
            <>
              <button
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}

          {/* Favorite button */}
          <button
            onClick={toggleFav}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFav}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow transition-colors',
              isFav ? 'bg-primary text-white' : 'bg-white/90 text-gray-600 hover:bg-white',
            )}
          >
            <Heart
              className="w-4 h-4"
              aria-hidden="true"
              fill={isFav ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {/* Card body */}
        <div className="p-3">
          <p className="text-lg font-bold text-gray-900">
            {formatPrice(property.price, property.currency, property.dealType)}
          </p>

          {/* Key facts */}
          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-600">
            {property.bedrooms !== null && (
              <span className="flex items-center gap-1">
                <BedDouble className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== null && (
              <span className="flex items-center gap-1">
                <Bath className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {property.bathrooms}
              </span>
            )}
            {property.area !== null && (
              <span className="flex items-center gap-1">
                <Maximize className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {property.area} m²
              </span>
            )}
            {property.floor !== null && property.floorsTotal !== null && (
              <span className="text-gray-400 text-xs">
                fl. {property.floor}/{property.floorsTotal}
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-sm text-gray-500 mt-1.5 truncate">
            {[property.district, property.city].filter(Boolean).join(', ')}
          </p>
        </div>
      </Link>
    </article>
  )
}
