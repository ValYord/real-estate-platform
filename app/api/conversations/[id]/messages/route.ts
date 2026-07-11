import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { messagesQuerySchema } from '@/lib/messages/schemas'
import type { AttachmentItem, MessageItem, MessagesResponse } from '@/lib/messages/types'

type Params = { id: string }
type RouteContext = { params: Promise<Params> }

const PAGE_SIZE = 30

interface ConversationRow {
  buyer_id: string
  seller_id: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  attachments: unknown
  is_read: boolean
  created_at: string
}

/**
 * GET /api/conversations/[id]/messages?before=<ISO timestamp>
 *
 * Cursor-paginated (newest-first fetch, returned oldest-first for rendering).
 * Auth: required; the caller must be a participant in the conversation.
 */
export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params
  const { searchParams } = new URL(request.url)

  const parsed = messagesQuerySchema.safeParse({
    before: searchParams.get('before') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
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
    .select('buyer_id, seller_id')
    .eq('id', id)
    .single()

  const conversation = convResult.data as unknown as ConversationRow | null
  if (convResult.error || !conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, attachments, is_read, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (parsed.data.before) {
    query = query.lt('created_at', parsed.data.before)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as MessageRow[]
  // Returned newest-first by the query; reverse to oldest-first for rendering.
  const ordered = rows.slice().reverse()

  const items: MessageItem[] = ordered.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    mine: row.sender_id === user.id,
    body: row.body,
    attachments: (Array.isArray(row.attachments) ? row.attachments : []) as AttachmentItem[],
    read: row.is_read,
    createdAt: row.created_at,
  }))

  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null

  const response: MessagesResponse = { items, nextCursor }
  return NextResponse.json(response)
}
