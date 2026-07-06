import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { activityQuerySchema } from '@/lib/dashboard/schemas'
import type { ActivityItem, ActivityResponse } from '@/lib/dashboard/types'

/**
 * GET /api/dashboard/activity?cursor=...&limit=20
 * Returns a paginated activity feed derived from messages and favorites.
 * Auth-gated: 401 when not authenticated.
 *
 * Phase 1: Derives events from messages (new_message) and favorites (favorited).
 * Cursor is an ISO timestamp string — returns events older than the cursor.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const queryParsed = activityQuerySchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? 20,
  })

  if (!queryParsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const { cursor, limit } = queryParsed.data
  const cursorDate = cursor ? new Date(cursor).toISOString() : new Date().toISOString()

  // Fetch user's property IDs for filtering
  const { data: myProperties } = await supabase
    .from('properties')
    .select('id, title')
    .eq('owner_id', user.id)
    .limit(100)

  type PropertyRef = { id: string; title: unknown }
  const myProps = (myProperties ?? []) as PropertyRef[]
  const myPropIds = myProps.map((p) => p.id)

  type LocalizedTitle = { hy?: string; ru?: string; en?: string }
  const propTitleById = new Map<string, string>()
  for (const p of myProps) {
    const t = p.title as LocalizedTitle
    propTitleById.set(p.id, t?.en ?? t?.hy ?? t?.ru ?? '')
  }

  const items: ActivityItem[] = []

  if (myPropIds.length > 0) {
    // Fetch recent conversations on user's properties (new messages)
    type ConvRow = {
      id: string
      property_id: string | null
      buyer_id: string
      created_at: string
      profiles: { full_name: string | null } | null
    }

    const { data: convRows } = await supabase
      .from('conversations')
      .select('id, property_id, buyer_id, created_at, profiles!conversations_buyer_id_fkey(full_name)')
      .in('property_id', myPropIds)
      .lt('created_at', cursorDate)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of ((convRows ?? []) as ConvRow[])) {
      items.push({
        id: `msg-${row.id}`,
        type: 'new_message',
        listingId: row.property_id,
        listingTitle: row.property_id ? (propTitleById.get(row.property_id) ?? null) : null,
        actorName: row.profiles?.full_name ?? null,
        count: null,
        conversationId: row.id,
        at: row.created_at,
      })
    }

    // Fetch recent favorites on user's properties
    type FavRow = {
      id: string
      property_id: string
      created_at: string
      profiles: { full_name: string | null } | null
    }

    const { data: favRows } = await supabase
      .from('favorites')
      .select('id, property_id, created_at, profiles!favorites_user_id_fkey(full_name)')
      .in('property_id', myPropIds)
      .lt('created_at', cursorDate)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const row of ((favRows ?? []) as FavRow[])) {
      items.push({
        id: `fav-${row.id}`,
        type: 'favorited',
        listingId: row.property_id,
        listingTitle: propTitleById.get(row.property_id) ?? null,
        actorName: row.profiles?.full_name ?? null,
        count: null,
        conversationId: null,
        at: row.created_at,
      })
    }
  }

  // Sort by time descending, take limit
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const page = items.slice(0, limit)
  const nextCursor = page.length === limit ? page[page.length - 1].at : null

  const response: ActivityResponse = {
    items: page,
    nextCursor,
  }

  return NextResponse.json(response)
}
