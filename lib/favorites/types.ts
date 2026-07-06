/**
 * Type definitions for the Favorites page (Page 07).
 */

import type { Currency, DealType, ListingStatus, PropertyType } from '@/types/database'

// ── Sort options ──────────────────────────────────────────────────────────────

export type FavoriteSort = 'recent' | 'price_asc' | 'price_desc' | 'price_drop'

// ── Favorite item returned by GET /api/favorites ──────────────────────────────

export interface FavoriteMediaItem {
  url: string
  sortOrder: number
}

/**
 * A property as returned in the favorites list response.
 * Includes the saved price and computed priceChangePct.
 */
export interface FavoriteItem {
  propertyId: string
  slug: string
  title: Record<string, string>
  price: number
  currency: Currency
  savedPrice: number | null
  /** Computed: (price - savedPrice) / savedPrice. Only set when |pct| >= 0.01. */
  priceChangePct: number | null
  status: ListingStatus | 'rented'
  dealType: DealType
  propertyType: PropertyType
  area: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floorsTotal: number | null
  city: string
  district: string | null
  media: FavoriteMediaItem[]
  savedAt: string
}

// ── Paginated response ────────────────────────────────────────────────────────

export interface FavoritesResponse {
  items: FavoriteItem[]
  total: number
  page: number
  pageSize: number
}

// ── API request/response shapes ───────────────────────────────────────────────

export interface AddFavoriteResponse {
  favorited: true
}

export interface RemoveFavoriteResponse {
  favorited: false
}
