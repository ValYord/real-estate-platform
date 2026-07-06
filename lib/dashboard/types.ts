/**
 * TypeScript types for the user dashboard (Page 06).
 * Used by API route handlers and client components.
 */

// ── Overview ─────────────────────────────────────────────────────────────────

export interface DashboardOverview {
  listings: number
  views: number
  unread: number
  favorites: number
  savedSearches: number
  agent: AgentStats | null
}

export interface AgentStats {
  rating: number
  reviews: number
  slug: string
}

// ── My listings ──────────────────────────────────────────────────────────────

export type MyListingStatus = 'active' | 'draft' | 'pending' | 'archived'

export interface ListingSummary {
  id: string
  title: { hy?: string; ru?: string; en?: string }
  price: number
  currency: string
  status: MyListingStatus
  thumbnail: string | null
  expiresAt: string | null
  stats: ListingStats
}

export interface ListingStats {
  views: number
  favorites: number
  messages: number
}

export interface MyListingsResponse {
  items: ListingSummary[]
}

// ── Activity feed ────────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'view_burst'
  | 'new_message'
  | 'listing_approved'
  | 'listing_rejected'
  | 'favorited'

export interface ActivityItem {
  id: string
  type: ActivityEventType
  listingId: string | null
  listingTitle: string | null
  actorName: string | null
  count: number | null
  conversationId: string | null
  at: string
}

export interface ActivityResponse {
  items: ActivityItem[]
  nextCursor: string | null
}

// ── Listing stats (modal) ─────────────────────────────────────────────────────

export type StatsRange = '7d' | '30d' | '90d'

export interface DailyViewPoint {
  date: string
  views: number
}

export interface ListingStatsResponse {
  viewsSeries: DailyViewPoint[]
  favorites: number
  messages: number
  leads: number
}

// ── Status toggle ─────────────────────────────────────────────────────────────

export interface StatusTogglePayload {
  status: 'active' | 'archived'
}

export interface StatusToggleResponse {
  id: string
  status: string
}
