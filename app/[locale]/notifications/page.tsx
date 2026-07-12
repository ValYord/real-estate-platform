import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { rowToNotificationItem, type NotificationRow } from '@/lib/notifications/helpers'
import type { NotificationItem } from '@/lib/notifications/types'
import NotificationsView from '@/components/notifications/NotificationsView'

export const metadata: Metadata = {
  title: 'Notifications | RE Platform',
  // Private, login-gated — never indexed (doc §8 SEO & meta).
  robots: { index: false, follow: false },
}

const PAGE_SIZE = 20

/**
 * `/notifications` — Page 22. Auth-gated SSR shell: fetches the first page
 * of the default "All" filter server-side (doc §0 "the full page is an SSR
 * initial list + client pagination/realtime"), then hands off to
 * <NotificationsView>, a client component that owns filtering, infinite
 * scroll, and the Realtime subscription.
 *
 * `/notifications` is listed in PROTECTED_PATHS (lib/auth/protectedPaths.ts)
 * so the middleware already redirects guests to `/auth/login?next=/notifications`
 * (doc "Roles"); the check below is defense in depth per the CLAUDE.md auth
 * rule (protected routes verify the session server-side too).
 */
export default async function NotificationsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/notifications')
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, is_read, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE)

  const rows = (error ? [] : (data ?? [])) as unknown as NotificationRow[]
  const initialItems: NotificationItem[] = rows
    .map(rowToNotificationItem)
    .filter((item): item is NotificationItem => item !== null)
  const initialNextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null

  return <NotificationsView initialItems={initialItems} initialNextCursor={initialNextCursor} />
}
