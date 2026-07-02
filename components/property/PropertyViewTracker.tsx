'use client'

import { useEffect } from 'react'
import { saveToRecentlyViewed } from './RecentlyViewed'
import type { PropertyDetail } from '@/lib/property/types'
import type { Locale } from '@/lib/locale'

interface PropertyViewTrackerProps {
  property: PropertyDetail
  locale: Locale
}

/**
 * Invisible client component that runs side-effects on mount:
 * 1. Saves the current property to localStorage for "Recently Viewed".
 *
 * Must be placed inside the page so it runs after hydration.
 */
export default function PropertyViewTracker({ property, locale }: PropertyViewTrackerProps) {
  useEffect(() => {
    const cover = property.media.find((m) => m.type === 'photo')?.url ?? null
    saveToRecentlyViewed({
      id: property.id,
      slug: property.slug,
      title: property.title,
      price: property.price,
      currency: property.currency,
      cover,
      city: property.location.city,
    })
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  void locale // used by parent for title rendering; acknowledged here

  return null
}
