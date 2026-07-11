import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { conversationPatchSchema } from '@/lib/messages/schemas'
import type { ConversationListItem } from '@/lib/messages/types'

type Params = { id: string }
type RouteContext = { params: Promise<Params> }

interface ConversationRow {
  id: string
  buyer_id: string
  seller_id: string
}

interface ProfileRef {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'agent' | 'admin'
  agent_slug: string | null
}

interface PropertyRef {
  id: string
  slug: string
  title: Record<string, string>
  price: number
  currency: string
  status: string
  property_media: Array<{ url: string; sort_order: number }> | null
}

interface ConversationDetailRow {
  id: string
  buyer_id: string
  seller_id: string
  archived: boolean
  muted: boolean
  last_message_at: string
  buyer: ProfileRef | ProfileRef[] | null
  seller: ProfileRef | ProfileRef[] | null
  properties: PropertyRef | PropertyRef[] | null
}

interface BlockRow {
  blocker_id: string
  blocked_id: string
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/**
 * GET /api/conversations/[id]
 *
 * Returns the conversation's metadata for the Thread view: peer, pinned
 * property card, archived/muted/blocked flags.
 *
 * Auth: required; the caller must be a participant.
 */
export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params
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
      `id, buyer_id, seller_id, archived, muted, last_message_at,
       buyer:profiles!conversations_buyer_id_fkey(id, full_name, avatar_url, role, agent_slug),
       seller:profiles!conversations_seller_id_fkey(id, full_name, avatar_url, role, agent_slug),
       properties(id, slug, title, price, currency, status, property_media(url, sort_order))`,
    )
    .eq('id', id)
    .single()

  const conversation = convResult.data as unknown as ConversationDetailRow | null
  if (convResult.error || !conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const isBuyer = conversation.buyer_id === user.id
  const peerProfile = firstOf(isBuyer ? conversation.seller : conversation.buyer)
  const property = firstOf(conversation.properties)
  const peerId = peerProfile?.id ?? (isBuyer ? conversation.seller_id : conversation.buyer_id)

  const blocksResult = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
  const blocked = ((blocksResult.data ?? []) as unknown as BlockRow[]).some(
    (b) =>
      (b.blocker_id === user.id && b.blocked_id === peerId) ||
      (b.blocker_id === peerId && b.blocked_id === user.id),
  )

  const media = (property?.property_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
  const title = property?.title
    ? (property.title.en ?? Object.values(property.title)[0] ?? '')
    : ''

  const item: ConversationListItem = {
    id: conversation.id,
    property: property
      ? {
          id: property.id,
          thumb: media[0]?.url ?? null,
          price: property.price,
          currency: property.currency,
          title,
          status: property.status,
        }
      : null,
    peer: {
      id: peerId,
      name: peerProfile?.full_name ?? 'Unknown',
      avatar: peerProfile?.avatar_url ?? null,
      role: peerProfile?.role ?? 'user',
      verified: Boolean(peerProfile?.role === 'agent' && peerProfile?.agent_slug),
    },
    lastMessage: null,
    unreadCount: 0,
    archived: conversation.archived,
    muted: conversation.muted,
    blocked,
    lastMessageAt: conversation.last_message_at,
  }

  return NextResponse.json(item)
}

/**
 * PATCH /api/conversations/[id]
 *
 * Body: { archived?: boolean, muted?: boolean, read?: boolean }
 * - archived/muted are written straight to the conversations row.
 * - read=true batch-marks every message from the peer as read (used when the
 *   thread is opened) — the other side then sees ✓✓ live via Realtime.
 *
 * Auth: required, and the caller must be a participant (buyer or seller).
 */
export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof conversationPatchSchema.parse>
  try {
    input = conversationPatchSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const convResult = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', id)
    .single()

  const conversation = convResult.data as unknown as ConversationRow | null
  if (convResult.error || !conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (input.archived !== undefined || input.muted !== undefined) {
    const patch: { archived?: boolean; muted?: boolean } = {}
    if (input.archived !== undefined) patch.archived = input.archived
    if (input.muted !== undefined) patch.muted = input.muted

    // See app/api/blocks/route.ts — same update-typing workaround.
    const { error } = await supabase
      .from('conversations')
      .update(patch as unknown as never)
      .eq('id', id)
    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  if (input.read) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true } as unknown as never)
      .eq('conversation_id', id)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
