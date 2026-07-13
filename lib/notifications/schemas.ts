import { z } from 'zod'

/**
 * Zod validation for Page 22 — Notifications.
 * Mirrors the API contracts documented in docs/en/pages/22-notifications.md §5.
 */

export const NOTIFICATION_TYPES = [
  'message',
  'price_drop',
  'saved_search_match',
  'listing_approved',
  'listing_rejected',
  'listing_expiring',
  'new_review',
] as const

// ── GET /api/notifications ──────────────────────────────────────────────────

export const notificationsQuerySchema = z.object({
  filter: z.enum(['all', 'unread', 'messages', 'property', 'alerts']).default('all'),
  cursor: z.string().datetime().optional(),
  // Not in the doc's contract, but a natural extension: the header dropdown
  // requests the last ~10 (doc §3.1), the full page paginates in 20s (§3.2).
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>

// ── PATCH /api/notifications/[id] ───────────────────────────────────────────

export const notificationPatchSchema = z.object({
  read: z.boolean(),
})

export type NotificationPatchInput = z.infer<typeof notificationPatchSchema>

// ── Route params ─────────────────────────────────────────────────────────────

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('id must be a UUID'),
})
