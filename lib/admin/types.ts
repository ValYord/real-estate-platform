/**
 * TypeScript types for the Admin Panel MVP (Page 24 — shell + Dashboard +
 * Moderation queue). Used by API route handlers and admin client components.
 */

import type { RejectReason } from './schemas'

export type { RejectReason }

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  users: number
  listings: {
    total: number
    active: number
    pending: number
    sold: number
    archived: number
  }
  /** Pending-moderation count — drives the sidebar badge + Attention card. */
  attention: number
}

// ── Moderation queue ─────────────────────────────────────────────────────────

export interface ListingTitle {
  hy?: string
  ru?: string
  en?: string
}

export interface ModerationListItem {
  id: string
  title: ListingTitle
  ownerName: string
  price: number
  currency: string
  thumbnail: string | null
  createdAt: string
}

export interface ModerationListResponse {
  items: ModerationListItem[]
}

/** Extra fields shown only in the row-click preview drawer (D6: simplified, no gallery/map). */
export interface ListingPreview extends ModerationListItem {
  description: ListingTitle
  city: string
  address: string | null
}

// ── Approve / reject ─────────────────────────────────────────────────────────

export interface ModerationActionResponse {
  id: string
  status: 'active' | 'rejected'
}

export interface RejectPayload {
  reason: RejectReason
  note?: string
}
