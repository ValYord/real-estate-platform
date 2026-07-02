'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/locale'

interface RecentItem {
  id: string
  slug: string
  title: { hy?: string; ru?: string; en?: string }
  price: number
  currency: string
  cover: string | null
  city: string
}

const STORAGE_KEY = 'recently_viewed'
const MAX_ITEMS = 6

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
 * Reads the last N visited properties from localStorage and renders a
 * horizontal carousel.  Populated by the property detail page on mount.
 */
export default function RecentlyViewed({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: RecentItem[] = JSON.parse(raw)
        setItems(parsed.slice(0, MAX_ITEMS))
      }
    } catch {
      // ignore
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section className="border-t border-gray-200 pt-8 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently viewed</h2>
      <div
        className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => {
          const titleStr = item.title[locale] ?? item.title.en ?? item.title.hy ?? 'Property'
          return (
            <Link
              key={item.id}
              href={`/property/${item.id}/${item.slug}`}
              className={cn(
                'flex-shrink-0 w-52 rounded-xl border border-gray-200 overflow-hidden snap-start',
                'hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label={titleStr}
            >
              <div className="relative h-32 bg-gray-100">
                {item.cover ? (
                  <Image src={item.cover} alt={titleStr} fill sizes="208px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900">
                  {formatPrice(item.price, item.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{item.city}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Saves the current property to localStorage for RecentlyViewed.
 * Called on mount from the property detail page client component.
 */
export function saveToRecentlyViewed(item: RecentItem): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const existing: RecentItem[] = raw ? (JSON.parse(raw) as RecentItem[]) : []
    const filtered = existing.filter((p) => p.id !== item.id)
    const updated = [item, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}
