import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { messageSchema } from '@/lib/messages/schemas'
import { checkRateLimit } from '@/lib/auth/rateLimit'

interface ConversationRow {
  id: string
  buyer_id: string
  seller_id: string
}

interface BlockRow {
  blocker_id: string
  blocked_id: string
}

interface MessageInsertResult {
  id: string
  created_at: string
}

/** 20 messages per 5 minutes per user — generous for real conversation, blocks bots. */
const SEND_LIMIT = { max: 20, windowMs: 5 * 60 * 1000 }

/**
 * POST /api/messages
 *
 * Body: { conversationId, body, attachments? } — see lib/messages/schemas.ts.
 * Sends a message in an existing conversation.
 *
 * Auth: required (401). Participant-only (403). Blocked pairs cannot send
 * (403 "blocked" — also enforced at the RLS layer as defense in depth).
 * Rate-limited to `SEND_LIMIT` per user (429).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof messageSchema.parse>
  try {
    input = messageSchema.parse(body)
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

  const rate = checkRateLimit(`messages:${user.id}`, SEND_LIMIT.max, SEND_LIMIT.windowMs)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const convResult = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', input.conversationId)
    .single()

  const conversation = convResult.data as unknown as ConversationRow | null
  if (convResult.error || !conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const peerId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id

  const blocksResult = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${user.id},blocker_id.eq.${peerId}`)
  const blocked = ((blocksResult.data ?? []) as unknown as BlockRow[]).some(
    (b) =>
      (b.blocker_id === user.id && b.blocked_id === peerId) ||
      (b.blocker_id === peerId && b.blocked_id === user.id),
  )
  if (blocked) {
    return NextResponse.json({ error: 'blocked' }, { status: 403 })
  }

  // See app/api/blocks/route.ts — same insert-typing workaround.
  const insertResult = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: user.id,
      body: input.body,
      attachments: input.attachments ?? [],
    } as unknown as never)
    .select('id, created_at')
    .single()

  const inserted = insertResult.data as unknown as MessageInsertResult | null
  if (insertResult.error || !inserted) {
    // A row-level-security rejection surfaces here too (e.g. block created
    // concurrently) — report it as "blocked" rather than a generic 500.
    if (insertResult.error?.code === '42501') {
      return NextResponse.json({ error: 'blocked' }, { status: 403 })
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ id: inserted.id, createdAt: inserted.created_at }, { status: 201 })
}
