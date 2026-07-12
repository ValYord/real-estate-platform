/**
 * Pure helper functions for Page 22 — Notifications.
 *
 * Kept side-effect-free (no fetch/DOM/Supabase) so they can be unit tested
 * directly and reused by the API routes (server) and the client components
 * (bell dropdown, full list) alike — one source of truth for row→item
 * mapping, filter categories, display text, and realtime list mutations.
 */

import type {
  NotificationFilter,
  NotificationItem,
  NotificationPayload,
  NotificationType,
} from './types'

// ── Row → item mapping ──────────────────────────────────────────────────────

/** Shape of a `notifications` row as returned by Supabase (see supabase/migrations/0001_init.sql). */
export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  metadata: unknown
  created_at: string
}

const KNOWN_TYPES: readonly NotificationType[] = [
  'message',
  'price_drop',
  'saved_search_match',
  'listing_approved',
  'listing_rejected',
  'listing_expiring',
  'new_review',
  'tour_requested',
]

function isNotificationType(value: string): value is NotificationType {
  return (KNOWN_TYPES as readonly string[]).includes(value)
}

function toPayload(metadata: unknown): NotificationPayload {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const record = metadata as Record<string, unknown>
  const payload: NotificationPayload = {}
  if (typeof record.conversationId === 'string') payload.conversationId = record.conversationId
  if (typeof record.propertyId === 'string') payload.propertyId = record.propertyId
  if (typeof record.searchId === 'string') payload.searchId = record.searchId
  if (typeof record.agentSlug === 'string') payload.agentSlug = record.agentSlug
  if (typeof record.title === 'string') payload.title = record.title
  if (typeof record.name === 'string') payload.name = record.name
  if (typeof record.percent === 'number') payload.percent = record.percent
  if (typeof record.rating === 'number') payload.rating = record.rating
  if (typeof record.requestedAt === 'string') payload.requestedAt = record.requestedAt
  if (record.tourType === 'in_person' || record.tourType === 'video') payload.tourType = record.tourType
  return payload
}

/**
 * Maps a raw `notifications` row to the API/UI shape. Returns `null` for a
 * row whose `type` isn't one of the seven documented types (defensive —
 * the DB CHECK constraint should already prevent this) so callers can
 * `.filter(Boolean)` it out rather than rendering something unrenderable.
 */
export function rowToNotificationItem(row: NotificationRow): NotificationItem | null {
  if (!isNotificationType(row.type)) return null
  return {
    id: row.id,
    type: row.type,
    read: row.is_read,
    payload: toPayload(row.metadata),
    createdAt: row.created_at,
  }
}

// ── Filter categories (doc §3.2 tabs) ───────────────────────────────────────

/**
 * Maps the three type-category tabs to the notification types they include.
 * Not specified verbatim by the doc (§3.3 lists 7 types against 3
 * non-"all"/"unread" tabs without an explicit mapping table), so this is an
 * explicit, documented assumption:
 *   - Messages: the `message` type.
 *   - Property: type-status events about a specific listing the user owns
 *     or favorited (price drop, approved, rejected, expiring).
 *   - Alerts: broader re-engagement events not tied to one property the
 *     user already has open (saved-search matches, agent reviews).
 */
export const FILTER_CATEGORY_TYPES: Partial<Record<NotificationFilter, NotificationType[]>> = {
  messages: ['message'],
  property: ['price_drop', 'listing_approved', 'listing_rejected', 'listing_expiring'],
  alerts: ['saved_search_match', 'new_review'],
}

export function matchesFilter(item: NotificationItem, filter: NotificationFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'unread') return !item.read
  return (FILTER_CATEGORY_TYPES[filter] ?? []).includes(item.type)
}

export function applyFilter(items: NotificationItem[], filter: NotificationFilter): NotificationItem[] {
  return items.filter((item) => matchesFilter(item, filter))
}

// ── Display text (doc §3.3) ─────────────────────────────────────────────────

export function notificationText(item: NotificationItem): string {
  const p = item.payload
  switch (item.type) {
    case 'message':
      return `New message from ${p.name ?? 'someone'}`
    case 'price_drop':
      return `The price of "${p.title ?? 'a saved property'}" dropped${
        p.percent != null ? ` ${p.percent}%` : ''
      }`
    case 'saved_search_match':
      return `New properties match "${p.title ?? 'your search'}"`
    case 'listing_approved':
      return `Your "${p.title ?? 'listing'}" listing was approved`
    case 'listing_rejected':
      return `"${p.title ?? 'Your listing'}" was rejected — see the reason`
    case 'listing_expiring':
      return `"${p.title ?? 'Your listing'}" expires soon`
    case 'new_review':
      return `${p.name ?? 'Someone'} rated you${p.rating != null ? ` ⭐${p.rating}` : ''}`
    case 'tour_requested':
      return `${p.name ?? 'Someone'} requested a tour of "${p.title ?? 'your listing'}"`
  }
}

// ── Click target (doc §3.3 "Click → target") ────────────────────────────────

/**
 * Resolves the documented navigation target for a notification. Returns
 * `null` when the payload is missing the id it needs (defensive — should not
 * happen for a well-formed row), which callers treat as a stale target.
 */
export function notificationHref(item: NotificationItem): string | null {
  const p = item.payload
  switch (item.type) {
    case 'message':
      return p.conversationId ? `/messages/${p.conversationId}` : null
    case 'price_drop':
    case 'listing_approved':
      return p.propertyId ? `/property/${p.propertyId}` : null
    case 'listing_rejected':
    case 'listing_expiring':
      return p.propertyId ? `/listing/${p.propertyId}/edit` : null
    case 'saved_search_match':
      return p.searchId ? `/saved-searches/${p.searchId}` : '/search'
    case 'new_review':
      return p.agentSlug ? `/agent/${p.agentSlug}#reviews` : null
    case 'tour_requested':
      return p.propertyId ? `/property/${p.propertyId}` : null
  }
}

// ── Type icon (doc §3.3 "Icon / color") ─────────────────────────────────────

export const NOTIFICATION_ICON: Record<NotificationType, { emoji: string; bg: string }> = {
  message: { emoji: '💬', bg: 'bg-blue-50' },
  price_drop: { emoji: '📉', bg: 'bg-orange-50' },
  saved_search_match: { emoji: '🔍', bg: 'bg-purple-50' },
  listing_approved: { emoji: '✅', bg: 'bg-green-50' },
  listing_rejected: { emoji: '⛔', bg: 'bg-red-50' },
  listing_expiring: { emoji: '⏳', bg: 'bg-yellow-50' },
  new_review: { emoji: '⭐', bg: 'bg-amber-50' },
  tour_requested: { emoji: '📅', bg: 'bg-teal-50' },
}

// ── Relative time (doc examples: "now", "5m", "2h", "1d") ──────────────────

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d`
}

// ── Badge count (doc §2 "9+ overflow when more than 9") ────────────────────

export function formatBadgeCount(count: number, max = 9): string {
  return count > max ? `${max}+` : String(count)
}

// ── List mutations (local/optimistic + realtime) ────────────────────────────

/** Idempotent prepend — a realtime INSERT for an id we already have (e.g. optimistic dup) is a no-op. */
export function mergeIncomingNotification(
  existing: NotificationItem[],
  incoming: NotificationItem,
): NotificationItem[] {
  if (existing.some((n) => n.id === incoming.id)) return existing
  return [incoming, ...existing]
}

export function setReadState(items: NotificationItem[], id: string, read: boolean): NotificationItem[] {
  return items.map((n) => (n.id === id ? { ...n, read } : n))
}

export function removeNotification(items: NotificationItem[], id: string): NotificationItem[] {
  return items.filter((n) => n.id !== id)
}

export function markAllRead(items: NotificationItem[]): NotificationItem[] {
  return items.map((n) => (n.read ? n : { ...n, read: true }))
}

export function countUnread(items: NotificationItem[]): number {
  return items.reduce((sum, n) => (n.read ? sum : sum + 1), 0)
}
