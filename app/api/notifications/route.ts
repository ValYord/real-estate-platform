import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { notificationsQuerySchema } from '@/lib/notifications/schemas'
import { FILTER_CATEGORY_TYPES, rowToNotificationItem, type NotificationRow } from '@/lib/notifications/helpers'
import type { NotificationItem, NotificationsResponse } from '@/lib/notifications/types'

const DEFAULT_LIMIT = 20

/**
 * GET /api/notifications?filter=all|unread|messages|property|alerts&cursor=...&limit=...
 *
 * Cursor-paginated (newest-first), scoped to the caller's own rows.
 * `filter` selects a category per doc §3.2's tabs; `limit` (not in the doc's
 * contract, defaults to 20) lets the header dropdown ask for ~10 (doc §3.1).
 *
 * Auth: required (401). RLS ("notifications: user can select own") also
 * scopes every row to `auth.uid()`, independent of the explicit `.eq()` below.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const parsed = notificationsQuerySchema.safeParse({
    filter: searchParams.get('filter') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const { filter, cursor, limit } = parsed.data
  const pageSize = limit ?? DEFAULT_LIMIT

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  let query = supabase
    .from('notifications')
    .select('id, user_id, type, title, body, is_read, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize)

  if (filter === 'unread') {
    query = query.eq('is_read', false)
  }
  const categoryTypes = FILTER_CATEGORY_TYPES[filter]
  if (categoryTypes) {
    query = query.in('type', categoryTypes)
  }
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as NotificationRow[]
  const items = rows
    .map(rowToNotificationItem)
    .filter((item): item is NotificationItem => item !== null)
  const nextCursor = rows.length === pageSize ? rows[rows.length - 1].created_at : null

  const response: NotificationsResponse = { items, nextCursor }
  return NextResponse.json(response)
}
