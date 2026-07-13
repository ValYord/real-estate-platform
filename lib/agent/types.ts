import type { Currency } from '@/types/database'
import type { PropertyListItem } from '@/lib/search/types'

/**
 * Types for Page 10 — Agent / Agency Profile (MVP).
 * Mirrors docs/en/pages/10-agent-profile.md §5 "Data fields" / "API contracts".
 */

export type AgentTier = 'free' | 'pro' | 'premium'
export type AgentBadge = 'top_agent' | 'fast_responder'
export type AgentStatus = 'active' | 'suspended'

export interface AgentStats {
  listingsActive: number | null
  dealsClosed: number | null
  avgResponseHours: number | null
  memberSince: string | null
}

export interface AgentProfile {
  id: string
  slug: string
  name: string
  avatar: string | null
  phone: string | null
  agencyName: string | null
  /** Always null in the MVP — the `/agency/[slug]` route is out of scope. */
  agencySlug: string | null
  verified: boolean
  status: AgentStatus
  tier: AgentTier
  rating: number
  reviewsCount: number
  bio: { hy?: string; ru?: string; en?: string }
  specialties: string[]
  languages: string[]
  scope: string[]
  stats: AgentStats
  badges: AgentBadge[]
  createdAt: string
  isOwner: boolean
}

/** Lightweight card used by the "Other agents" carousel. */
export interface OtherAgentCard {
  id: string
  slug: string
  name: string
  avatar: string | null
  agencyName: string | null
  rating: number
  reviewsCount: number
  verified: boolean
}

// ── Listings ─────────────────────────────────────────────────────────────────

export type AgentListingsDeal = 'all' | 'sale' | 'rent'
export type AgentListingsSort = 'new' | 'price_asc' | 'price_desc'

export interface AgentListingsResponse {
  items: PropertyListItem[]
  total: number
  page: number
  pageSize: number
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export interface AgentReview {
  id: string
  agentId: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  rating: number
  text: string
  reply: string | null
  repliedAt: string | null
  createdAt: string
}

export type ReviewBreakdown = Record<'1' | '2' | '3' | '4' | '5', number>

export interface ReviewSummary {
  average: number
  count: number
  breakdown: ReviewBreakdown
}

export type AgentReviewsSort = 'newest' | 'highest' | 'lowest'

export interface AgentReviewsResponse {
  items: AgentReview[]
  summary: ReviewSummary
  page: number
  pageSize: number
  total: number
  /** Whether the current session user has already reviewed this agent. */
  viewerHasReviewed: boolean
}

// ── Currency re-export (convenience for form components) ───────────────────
export type { Currency }
