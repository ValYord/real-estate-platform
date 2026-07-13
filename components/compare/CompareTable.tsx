'use client'

import Image from 'next/image'
import { AlertTriangle, Check, Maximize, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { CompareProperty } from '@/lib/compare/types'
import { isUnavailable } from '@/lib/compare/state'

interface CompareTableProps {
  properties: CompareProperty[]
  onRemove: (id: string) => void
}

function titleFor(item: CompareProperty): string {
  if (!item.title) return 'Property'
  return item.title['en'] ?? item.title['hy'] ?? Object.values(item.title)[0] ?? 'Property'
}

function currencySymbol(currency: string): string {
  return currency === 'AMD' ? '֏' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'
}

function formatPrice(item: CompareProperty): string {
  if (item.price === null || item.currency === null) return '—'
  const symbol = currencySymbol(item.currency)
  const amount = item.price.toLocaleString()
  const value = item.currency === 'AMD' ? `${amount} ${symbol}` : `${symbol}${amount}`
  return item.dealType === 'rent' ? `${value}/month` : value
}

function formatPricePerM2(item: CompareProperty): string {
  if (item.price === null || !item.area || item.currency === null) return '—'
  const perM2 = Math.round(item.price / item.area)
  const symbol = currencySymbol(item.currency)
  return item.currency === 'AMD' ? `${perM2.toLocaleString()} ${symbol}` : `${symbol}${perM2.toLocaleString()}`
}

function humanizeAmenity(key: string): string {
  const spaced = key.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

interface Row {
  label: string
  render: (item: CompareProperty) => React.ReactNode
}

function buildRows(properties: CompareProperty[]): Row[] {
  const amenityKeys = Array.from(new Set(properties.flatMap((p) => p.amenities))).sort()

  const baseRows: Row[] = [
    { label: 'Price', render: (item) => (item.unavailable ? '—' : formatPrice(item)) },
    { label: 'Price / m²', render: (item) => (item.unavailable ? '—' : formatPricePerM2(item)) },
    { label: 'Area', render: (item) => (item.unavailable || item.area === null ? '—' : `${item.area} m²`) },
    { label: 'Rooms', render: (item) => (item.unavailable || item.rooms === null ? '—' : item.rooms) },
    { label: 'Bedrooms', render: (item) => (item.unavailable || item.bedrooms === null ? '—' : item.bedrooms) },
    { label: 'Bathrooms', render: (item) => (item.unavailable || item.bathrooms === null ? '—' : item.bathrooms) },
    {
      label: 'Floor',
      render: (item) =>
        item.unavailable || item.floor === null || item.floorsTotal === null
          ? '—'
          : `${item.floor}/${item.floorsTotal}`,
    },
    { label: 'Year built', render: (item) => (item.unavailable || item.yearBuilt === null ? '—' : item.yearBuilt) },
    { label: 'Property type', render: (item) => (item.unavailable || !item.propertyType ? '—' : item.propertyType) },
    { label: 'Deal type', render: (item) => (item.unavailable || !item.dealType ? '—' : item.dealType) },
  ]

  const amenityRows: Row[] = amenityKeys.map((key) => ({
    label: humanizeAmenity(key),
    render: (item) => {
      if (item.unavailable) return <span className="text-gray-300">—</span>
      return item.amenities.includes(key) ? (
        <Check className="w-4 h-4 text-green-600 mx-auto" aria-label="Yes" />
      ) : (
        <span className="text-gray-300" aria-label="No">—</span>
      )
    },
  }))

  const locationRows: Row[] = [
    { label: 'District', render: (item) => (item.unavailable || !item.district ? '—' : item.district) },
    { label: 'City', render: (item) => (item.unavailable || !item.city ? '—' : item.city) },
  ]

  return [...baseRows, ...amenityRows, ...locationRows]
}

/**
 * The comparison table itself: sticky row-labels column on the left, one
 * column per property (2-4). An unavailable (sold/deleted) property renders
 * a "No longer available" header in its column instead of the photo/title,
 * and dashes for every data row — the column keeps its slot so the other
 * columns don't visually jump.
 */
export function CompareTable({ properties, onRemove }: CompareTableProps) {
  const rows = buildRows(properties)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white p-3 border-b border-gray-100 w-24" />
            {properties.map((item) => {
              const unavailable = isUnavailable(item)
              const title = titleFor(item)
              return (
                <th
                  key={item.id}
                  scope="col"
                  className="p-3 border-b border-gray-100 align-top min-w-[160px] sm:min-w-[200px]"
                >
                  {unavailable ? (
                    <div className="flex flex-col items-center gap-2 py-2 text-center">
                      <div
                        className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <AlertTriangle className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500">No longer available</p>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Remove from comparison: ${title}`}
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Remove from comparison: ${title}`}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-gray-500 hover:text-red-600 hover:bg-white flex items-center justify-center shadow transition-colors z-10"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <Link href={`/property/${item.id}/${item.slug ?? ''}`} className="block">
                        {item.cover ? (
                          <Image
                            src={item.cover}
                            alt={`${title}${item.district ? ` — ${item.district}` : ''}`}
                            width={200}
                            height={112}
                            className="w-full h-28 rounded-lg object-cover cursor-pointer"
                          />
                        ) : (
                          <div className="w-full h-28 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                            <Maximize className="w-8 h-8" aria-hidden="true" />
                          </div>
                        )}
                      </Link>
                      <p className="mt-2 text-sm font-medium text-gray-900 truncate">{title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {[item.district, item.city].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white text-sm text-gray-500 font-medium text-left p-3 border-b border-gray-100 whitespace-nowrap"
              >
                {row.label}
              </th>
              {properties.map((item) => (
                <td
                  key={item.id}
                  className="text-sm text-gray-900 p-3 border-b border-gray-100 text-center min-w-[160px] sm:min-w-[200px]"
                >
                  {row.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
