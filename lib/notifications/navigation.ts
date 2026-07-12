/**
 * Click-to-target resolution for Page 22 — Notifications (doc §3.3 / §3.5).
 *
 * Takes a Supabase client so it works from any client component without
 * importing browser-only modules itself; callers pass the browser client
 * from `@/lib/supabase/client`.
 */

import type { createClient } from '@/lib/supabase/client'
import { notificationHref } from './helpers'
import type { NotificationItem } from './types'

type BrowserSupabaseClient = ReturnType<typeof createClient>

export interface ResolvedTarget {
  href: string
  stale: false
}

export interface StaleTarget {
  href: null
  stale: true
}

/**
 * Resolves the navigation target for a notification.
 *
 * For types whose target table exists in this codebase (`message` →
 * conversations, `price_drop`/`listing_approved`/`listing_rejected`/
 * `listing_expiring` → properties), this does a lightweight existence check
 * through the given RLS-scoped client first — a deleted/inaccessible row
 * (RLS already hides other users' conversations and non-active, non-owned
 * properties) surfaces as "stale" rather than sending the user to a broken
 * page (doc §3.5 "Stale target").
 *
 * `saved_search_match` (→ /saved-searches/[id]) and `new_review`
 * (→ /agent/[slug]#reviews) target pages 08/10, which aren't implemented in
 * this codebase yet — out of scope for Page 22 — so those resolve straight
 * to their documented href without an existence check.
 */
export async function resolveNotificationTarget(
  supabase: BrowserSupabaseClient,
  item: NotificationItem,
): Promise<ResolvedTarget | StaleTarget> {
  const href = notificationHref(item)
  if (!href) return { href: null, stale: true }

  if (item.type === 'message' && item.payload.conversationId) {
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', item.payload.conversationId)
      .maybeSingle()
    if (!data) return { href: null, stale: true }
  }

  const isPropertyTarget =
    item.type === 'price_drop' ||
    item.type === 'listing_approved' ||
    item.type === 'listing_rejected' ||
    item.type === 'listing_expiring' ||
    item.type === 'tour_requested'

  if (isPropertyTarget && item.payload.propertyId) {
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('id', item.payload.propertyId)
      .maybeSingle()
    if (!data) return { href: null, stale: true }
  }

  return { href, stale: false }
}
