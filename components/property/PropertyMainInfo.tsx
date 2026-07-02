import { BedDouble, Bath, Maximize2, Building2, Calendar, Tag, MapPin, CheckCircle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyDetail } from '@/lib/property/types'
import type { Locale } from '@/lib/locale'

interface PropertyMainInfoProps {
  property: PropertyDetail
  locale: Locale
  displayCurrency: string
}

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

function formatPrice(price: number, currency: string, dealType: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  let formatted: string
  if (currency === 'AMD') {
    if (price >= 1_000_000) {
      formatted = `${(price / 1_000_000).toLocaleString('hy-AM', { maximumFractionDigits: 1 })}M ${symbol}`
    } else {
      formatted = `${price.toLocaleString()} ${symbol}`
    }
  } else {
    formatted = `${symbol}${price.toLocaleString()}`
  }
  return dealType === 'rent' ? `${formatted} /ամիս` : formatted
}

const TYPE_LABELS: Record<string, Record<string, string>> = {
  apartment: { hy: 'Բնակարան', ru: 'Квартира', en: 'Apartment' },
  house: { hy: 'Տուն', ru: 'Дом', en: 'House' },
  commercial: { hy: 'Կոմերցիոն', ru: 'Коммерческая', en: 'Commercial' },
  land: { hy: 'Հողատարածք', ru: 'Земля', en: 'Land' },
  garage: { hy: 'Ավտոտնակ', ru: 'Гараж', en: 'Garage' },
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Moderation in progress', className: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  sold: { label: 'This property is no longer available', className: 'bg-gray-100 border-gray-300 text-gray-700' },
  archived: { label: 'This property is no longer available', className: 'bg-gray-100 border-gray-300 text-gray-700' },
}

export default function PropertyMainInfo({ property, locale, displayCurrency }: PropertyMainInfoProps) {
  const title =
    property.title[locale] ??
    property.title.en ??
    property.title.hy ??
    'Property'

  const priceStr = formatPrice(property.price, displayCurrency, property.dealType)

  const { location } = property
  const address = location.hideExact
    ? [location.district, location.city].filter(Boolean).join(', ')
    : [location.address ?? location.district, location.city].filter(Boolean).join(', ')

  const typeLabel =
    TYPE_LABELS[property.propertyType]?.[locale] ??
    TYPE_LABELS[property.propertyType]?.en ??
    property.propertyType

  const statusInfo = STATUS_STYLES[property.status]
  const isUnavailable = property.status === 'sold' || property.status === 'archived'

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {statusInfo && (
        <div
          role="status"
          className={cn(
            'px-4 py-3 rounded-lg border text-sm font-medium',
            statusInfo.className,
          )}
        >
          {statusInfo.label}
        </div>
      )}

      {/* Price */}
      <div>
        <p
          className={cn(
            'text-3xl font-bold',
            isUnavailable ? 'text-gray-400 line-through' : 'text-gray-900',
          )}
        >
          {priceStr}
        </p>
        {displayCurrency !== property.currency && (
          <p className="text-sm text-gray-400 mt-0.5">
            Original: {formatPrice(property.price, property.currency, property.dealType)}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {property.isNew && (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-md uppercase">
            New
          </span>
        )}
        {property.isFeatured && (
          <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-md uppercase">
            Featured
          </span>
        )}
        {property.owner.agent?.verified && (
          <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1">
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            Verified
          </span>
        )}
        {(property.owner.agent?.rating ?? 0) > 0 && (
          <span className="text-xs text-gray-500 flex items-center gap-1 px-2 py-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
            {property.owner.agent?.rating.toFixed(1)}
            {property.owner.agent?.reviews != null && (
              <span className="text-gray-400">({property.owner.agent.reviews})</span>
            )}
          </span>
        )}
      </div>

      {/* H1 title */}
      <h1 className="text-2xl font-semibold text-gray-900 leading-tight">{title}</h1>

      {/* Address */}
      <p className="flex items-center gap-1.5 text-gray-600 text-sm">
        <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
        {address}
        {location.lat != null && (
          <a
            href="#property-map"
            className="text-primary hover:underline text-xs ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            On the map
          </a>
        )}
      </p>

      {/* Key facts row */}
      <div className="flex flex-wrap gap-5 text-sm text-gray-700">
        {property.bedrooms != null && (
          <span className="flex items-center gap-1.5">
            <BedDouble className="w-5 h-5 text-gray-500" aria-hidden="true" />
            {property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}
          </span>
        )}
        {property.bathrooms != null && (
          <span className="flex items-center gap-1.5">
            <Bath className="w-5 h-5 text-gray-500" aria-hidden="true" />
            {property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'}
          </span>
        )}
        {property.area != null && (
          <span className="flex items-center gap-1.5">
            <Maximize2 className="w-5 h-5 text-gray-500" aria-hidden="true" />
            {property.area} m²
          </span>
        )}
        {property.floor != null && property.floorsTotal != null && (
          <span className="flex items-center gap-1.5">
            <Building2 className="w-5 h-5 text-gray-500" aria-hidden="true" />
            floor {property.floor}/{property.floorsTotal}
          </span>
        )}
        {property.yearBuilt != null && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-5 h-5 text-gray-500" aria-hidden="true" />
            {property.yearBuilt}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Tag className="w-5 h-5 text-gray-500" aria-hidden="true" />
          {typeLabel}
        </span>
      </div>
    </div>
  )
}
