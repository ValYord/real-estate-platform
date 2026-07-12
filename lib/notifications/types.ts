/**
 * Type definitions for Page 22 — Notifications.
 * Mirrors docs/en/pages/22-notifications.md §5 "Data fields" / "API contracts".
 */

/** The seven notification types documented in doc §3.3. */
export type NotificationType =
  | 'message'
  | 'price_drop'
  | 'saved_search_match'
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_expiring'
  | 'new_review'

/** Filter tabs on `/notifications` (doc §3.2) — `all`/`unread` are cross-cutting, the rest are type categories. */
export type NotificationFilter = 'all' | 'unread' | 'messages' | 'property' | 'alerts'

/**
 * Structured data a notification carries about its target, stored in the
 * `notifications.metadata` jsonb column. Which fields are present depends on
 * `type` — see doc §3.3's "Text (example)" column for how each type uses them.
 */
export interface NotificationPayload {
  conversationId?: string
  propertyId?: string
  searchId?: string
  agentSlug?: string
  /** Property/listing/search title, used in the rendered text. */
  title?: string
  /** Sender/reviewer display name. */
  name?: string
  /** Price-drop percentage (e.g. 5 for "dropped 5%"). */
  percent?: number
  /** Review rating (e.g. 4 for "⭐4"). */
  rating?: number
}

export interface NotificationItem {
  id: string
  type: NotificationType
  read: boolean
  payload: NotificationPayload
  createdAt: string
}

// ── GET /api/notifications ──────────────────────────────────────────────────

export interface NotificationsResponse {
  items: NotificationItem[]
  nextCursor: string | null
}

// ── GET /api/notifications/unread-count ─────────────────────────────────────

export interface UnreadCountResponse {
  count: number
}

// ── PATCH /api/notifications/read-all ───────────────────────────────────────

export interface ReadAllResponse {
  updated: number
}
