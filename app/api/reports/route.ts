import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { conversationReportSchema } from '@/lib/messages/schemas'
import { reviewReportSchema } from '@/lib/agent/schemas'

interface ConversationRow {
  buyer_id: string
  seller_id: string
}

/**
 * POST /api/reports
 *
 * Two request shapes share this endpoint:
 *   { conversationId, reason, note? }                 — report a conversation
 *   { targetType: 'review', targetId, reason, note? } — report an agent
 *                                                        review (docs/en/pages/10 §3.6)
 * Both file a report for the admin moderation queue (24-admin.md / out of
 * scope for page 10) and return 202 Accepted.
 *
 * Auth: required in both cases. Validation happens before the auth check so
 * a malformed body is always rejected with 422, regardless of session state
 * (mirrors the original conversation-report behavior).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const isReviewReport =
    typeof body === 'object' && body !== null && (body as Record<string, unknown>).targetType === 'review'

  if (isReviewReport) {
    return handleReviewReport(body)
  }
  return handleConversationReport(body)
}

async function handleReviewReport(body: unknown): Promise<NextResponse> {
  let input: ReturnType<typeof reviewReportSchema.parse>
  try {
    input = reviewReportSchema.parse(body)
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

  const reviewResult = await supabase
    .from('agent_reviews')
    .select('id')
    .eq('id', input.targetId)
    .single()

  if (reviewResult.error || !reviewResult.data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    review_id: input.targetId,
    reason: input.reason,
    note: input.note,
  } as unknown as never)

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Report received' }, { status: 202 })
}

async function handleConversationReport(body: unknown): Promise<NextResponse> {
  let input: ReturnType<typeof conversationReportSchema.parse>
  try {
    input = conversationReportSchema.parse(body)
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
    .select('buyer_id, seller_id')
    .eq('id', input.conversationId)
    .single()

  const conversation = convResult.data as unknown as ConversationRow | null
  if (convResult.error || !conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // See app/api/blocks/route.ts — same insert-typing workaround.
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    conversation_id: input.conversationId,
    reason: input.reason,
    note: input.note,
  } as unknown as never)

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Report received' }, { status: 202 })
}
