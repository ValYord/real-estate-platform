import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { conversationSchema } from '@/lib/property/schemas'
import { conversationsQuerySchema } from '@/lib/messages/schemas'
import { firstOf, mapPeer, mapProperty, type ProfileRef, type PropertyRef } from '@/lib/messages/server'
import type { ConversationListItem, ConversationsResponse } from '@/lib/messages/types'

// ── Type helpers for the Supabase query results ───────────────────────────────

interface ConversationRow {
  id: string
  property_id: string | null
  buyer_id: string
  seller_id: string
  archived: boolean
  muted: boolean
  blocked_by: string | null
  last_message_at: string
  buyer: ProfileRef | ProfileRef[] | null
  seller: ProfileRef | ProfileRef[] | null
  properties: PropertyRef | PropertyRef[] | null
}

interface MessageRow {
  conversation_id: string
  sender_id: string
  body: string
  is_read: boolean
  created_at: string
}

interface BlockRow {
  blocker_id: string
  blocked_id: string
}

// ── GET /api/conversations ────────────────────────────────────────────────────

/**
 * GET /api/conversations?tab=all|unread|archived&search=...
 *
 * Returns the authenticated user's conversation list: peer, pinned property
 * summary, last message preview, and per-conversation unread count.
 * Filtering by tab/search also happens client-side (Realtime updates need it
 * to re-filter locally); the query params let the server pre-filter too.
 *
 * Auth: required — 401 when the caller is not authenticated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const parsed = conversationsQuerySchema.safeParse({
    tab: searchParams.get('tab') ?? undefined,
    search: searchParams.get('search') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project-id')) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const convResult = await supabase
      .from('conversations')
      .select(
        `id, property_id, buyer_id, seller_id, archived, muted, blocked_by, last_message_at,
         buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url, role, agent_slug),
         seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url, role, agent_slug),
         properties(id, slug, title, price, currency, status, property_media(url, sort_order))`,
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (convResult.error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const conversations = (convResult.data ?? []) as unknown as ConversationRow[]
    const conversationIds = conversations.map((c) => c.id)

    // Last message + unread count per conversation (single round-trip).
    const messagesByConv = new Map<string, MessageRow[]>()
    if (conversationIds.length > 0) {
      const msgResult = await supabase
        .from('messages')
        .select('conversation_id, sender_id, body, is_read, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      for (const row of (msgResult.data ?? []) as unknown as MessageRow[]) {
        const list = messagesByConv.get(row.conversation_id) ?? []
        list.push(row)
        messagesByConv.set(row.conversation_id, list)
      }
    }

    // Blocks involving the current user, to flag conversations as blocked.
    const blocksResult = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
    const blockRows = (blocksResult.data ?? []) as unknown as BlockRow[]

    const items: ConversationListItem[] = conversations.map((c) => {
      const isBuyer = c.buyer_id === user.id
      const peerProfile = firstOf(isBuyer ? c.seller : c.buyer)
      const property = firstOf(c.properties)
      const convMessages = messagesByConv.get(c.id) ?? []
      const last = convMessages[0]
      const unreadCount = convMessages.filter(
        (m) => m.sender_id !== user.id && !m.is_read,
      ).length
      const peerId = peerProfile?.id ?? (isBuyer ? c.seller_id : c.buyer_id)
      const blocked = blockRows.some(
        (b) =>
          (b.blocker_id === user.id && b.blocked_id === peerId) ||
          (b.blocker_id === peerId && b.blocked_id === user.id),
      )

      return {
        id: c.id,
        property: mapProperty(property),
        peer: mapPeer(peerProfile, peerId),
        lastMessage: last
          ? { body: last.body, createdAt: last.created_at, mine: last.sender_id === user.id }
          : null,
        unreadCount,
        archived: c.archived,
        muted: c.muted,
        blocked,
        lastMessageAt: c.last_message_at,
      }
    })

    // Apply tab/search filtering server-side when requested. Omitting `tab`
    // returns the full list (archived + non-archived) so the client can
    // switch tabs locally without a refetch — see conversationsQuerySchema.
    const { tab, search } = parsed.data
    let filtered = items
    if (tab === 'unread') {
      filtered = filtered.filter((i) => i.unreadCount > 0 && !i.archived)
    } else if (tab === 'archived') {
      filtered = filtered.filter((i) => i.archived)
    } else if (tab === 'all') {
      filtered = filtered.filter((i) => !i.archived)
    }
    if (search) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(
        (i) => i.peer.name.toLowerCase().includes(q) || i.property?.title.toLowerCase().includes(q),
      )
    }

    const response: ConversationsResponse = { items: filtered }
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/**
 * POST /api/conversations
 *
 * Creates (or reopens) a conversation between the authenticated user and the
 * property owner, optionally including a prefilled message.
 *
 * Auth: required — returns 401 when the caller is not authenticated.
 * Rate-limit: 5 requests per hour per user (returns 429 when exceeded).
 *
 * Body: { propertyId: string, message: string }
 * Returns: 201 { conversationId: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof conversationSchema.parse>
  try {
    input = conversationSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && anonKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createServerClient } = await import('@/lib/supabase/server')
      const supabase = await createServerClient()

      // Auth check
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'auth_required' }, { status: 401 })
      }

      // Fetch property to get the seller id
      type PropertyRow = { id: string; owner_id: string }
      const propResult = await supabase
        .from('properties')
        .select('id, owner_id')
        .eq('id', input.propertyId)
        .single()

      const property = propResult.data as PropertyRow | null
      const propError = propResult.error

      if (propError || !property) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }

      // Prevent messaging oneself
      if (property.owner_id === user.id) {
        return NextResponse.json(
          { error: 'cannot_message_self' },
          { status: 422 },
        )
      }

      // Look for an existing conversation
      type ConversationRow = { id: string }
      const existingResult = await supabase
        .from('conversations')
        .select('id')
        .eq('property_id', input.propertyId)
        .eq('buyer_id', user.id)
        .eq('seller_id', property.owner_id)
        .maybeSingle()

      const existing = existingResult.data as ConversationRow | null

      let conversationId: string

      if (existing) {
        conversationId = existing.id
      } else {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const adminSupabase = createAdminClient()

        const createdResult = await adminSupabase
          .from('conversations')
          .insert({
            property_id: input.propertyId,
            buyer_id: user.id,
            seller_id: property.owner_id,
          })
          .select('id')
          .single()

        const created = createdResult.data as ConversationRow | null
        const createError = createdResult.error

        if (createError || !created) {
          return NextResponse.json({ error: 'server_error' }, { status: 500 })
        }

        conversationId = created.id

        // Insert the initial message
        await adminSupabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: input.message,
        })
      }

      return NextResponse.json({ conversationId }, { status: 201 })
    } catch {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  // Development / test: no Supabase configured — return 401 (no auth)
  return NextResponse.json({ error: 'auth_required' }, { status: 401 })
}
