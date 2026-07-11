import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { blockSchema } from '@/lib/messages/schemas'

/**
 * POST /api/blocks
 *
 * Body: { userId } — blocks the given user. Neither side can send new
 * messages afterwards (enforced by RLS on `messages`); the conversation
 * stays visible but the send box is disabled.
 *
 * Auth: required (401). A user cannot block themselves (422).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof blockSchema.parse>
  try {
    input = blockSchema.parse(body)
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

  if (input.userId === user.id) {
    return NextResponse.json({ error: 'cannot_block_self' }, { status: 422 })
  }

  // The generated Database type doesn't narrow `.upsert()`'s argument from
  // `Database["public"]["Tables"]["blocks"]["Insert"]` in this supabase-js
  // version (same known quirk worked around in app/api/listings/route.ts and
  // app/api/favorites/route.ts) — cast the payload, not the client.
  const { error } = await supabase
    .from('blocks')
    .upsert(
      { blocker_id: user.id, blocked_id: input.userId } as unknown as never,
      { onConflict: 'blocker_id,blocked_id' },
    )

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ blocked: true })
}
