import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { conversationSchema } from '@/lib/property/schemas'

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
