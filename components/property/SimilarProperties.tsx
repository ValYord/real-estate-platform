'use client'

import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, BedDouble, Bath, Maximize2 } from 'lucide-react'
import { useRef } from 'react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { SimilarProperty } from '@/lib/property/types'
import type { Locale } from '@/lib/locale'

interface SimilarPropertiesProps {
  propertyId: string
  locale: Locale
}

const CURRENCY_SYMBOL: Record<string, string> = {
  AMD: '֏',
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  if (currency === 'AMD') {
    return `${(price / 1_000_000).toLocaleString('en', { maximumFractionDigits: 1 })}M ${symbol}`
  }
  return `${symbol}${price.toLocaleString()}`
}

/**
 * Horizontal carousel of similar property cards.
 * Data is fetched client-side via React Query.
 */
export default function SimilarProperties({ propertyId, locale }: SimilarPropertiesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery<{ items: SimilarProperty[] }>({
    queryKey: ['similar', propertyId],
    queryFn: () =>
      fetch(`/api/properties/${propertyId}/similar`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const items = data?.items ?? []

  if (items.length === 0) return null

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  return (
    <section className="border-t border-gray-200 pt-8 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Similar properties</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => {
          const titleStr =
            item.title[locale] ??
            item.title.en ??
            item.title.hy ??
            'Property'

          return (
            <Link
              key={item.id}
              href={`/property/${item.id}/${item.slug}`}
              className={cn(
                'flex-shrink-0 w-64 rounded-xl border border-gray-200 overflow-hidden snap-start',
                'hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label={titleStr}
            >
              <div className="relative h-40 bg-gray-100">
                {item.cover ? (
                  <Image
                    src={item.cover}
                    alt={titleStr}
                    fill
                    sizes="256px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
                {item.status === 'sold' && (
                  <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                    <span className="text-white text-sm font-bold uppercase">Sold</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-base font-bold text-gray-900">
                  {formatPrice(item.price, item.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate">{titleStr}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                  {item.bedrooms != null && (
                    <span className="flex items-center gap-0.5">
                      <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                      {item.bedrooms}
                    </span>
                  )}
                  {item.bathrooms != null && (
                    <span className="flex items-center gap-0.5">
                      <Bath className="w-3.5 h-3.5" aria-hidden="true" />
                      {item.bathrooms}
                    </span>
                  )}
                  {item.area != null && (
                    <span className="flex items-center gap-0.5">
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {item.area} m²
                    </span>
                  )}
                </div>
                {item.district && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {item.district}, {item.city}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
