'use client'

import { MapPin, BedDouble, Bath, Maximize2, Building2 } from 'lucide-react'
import type { WizardFormData } from '@/lib/listings/types'

interface ListingPreviewProps {
  data: Partial<WizardFormData>
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  AMD: '֏', USD: '$', EUR: '€', RUB: '₽',
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartment', house: 'House', land: 'Land',
  commercial: 'Commercial', newdev: 'New development', garage: 'Garage',
}

function formatPrice(price: number | undefined, currency: string | undefined, isRent: boolean): string {
  if (!price || !currency) return '—'
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency
  const formatted = price.toLocaleString()
  return isRent ? `${symbol}${formatted} /month` : `${symbol}${formatted}`
}

export default function ListingPreview({ data }: ListingPreviewProps) {
  const isRent = data.dealType === 'rent'
  const priceStr = formatPrice(data.price, data.currency, isRent)
  const title = data.title?.hy || 'Your listing title'
  const description = data.description?.hy || ''
  const coverPhoto = data.media?.[0]

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Cover image */}
      <div className="aspect-[16/9] bg-gray-100 relative">
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto.thumb ?? coverPhoto.url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-300 text-4xl">🏠</span>
          </div>
        )}
        {data.media && data.media.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            +{data.media.length - 1} photos
          </span>
        )}
        {data.negotiable && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded font-medium">
            Negotiable
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Price */}
        <p className="text-2xl font-bold text-gray-900">{priceStr}</p>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-800 leading-snug">{title}</h3>

        {/* Location */}
        {(data.city || data.district) && (
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {[data.district, data.city].filter(Boolean).join(', ')}
          </p>
        )}

        {/* Key facts */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          {data.bedrooms != null && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-gray-400" aria-hidden="true" />
              {data.bedrooms} bed{data.bedrooms !== 1 ? 's' : ''}
            </span>
          )}
          {data.bathrooms != null && (
            <span className="flex items-center gap-1.5">
              <Bath className="w-4 h-4 text-gray-400" aria-hidden="true" />
              {data.bathrooms} bath{data.bathrooms !== 1 ? 's' : ''}
            </span>
          )}
          {data.areaM2 != null && (
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-gray-400" aria-hidden="true" />
              {data.areaM2} m²
            </span>
          )}
          {data.floor != null && data.floorsTotal != null && (
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-400" aria-hidden="true" />
              Floor {data.floor}/{data.floorsTotal}
            </span>
          )}
          {data.propertyType && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              {PROPERTY_TYPE_LABELS[data.propertyType] ?? data.propertyType}
            </span>
          )}
        </div>

        {/* Description preview */}
        {description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{description}</p>
        )}

        {/* Amenities chips */}
        {data.amenities && data.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {data.amenities.slice(0, 6).map((a) => (
              <span
                key={a}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {a}
              </span>
            ))}
            {data.amenities.length > 6 && (
              <span className="text-xs text-gray-400">+{data.amenities.length - 6} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
