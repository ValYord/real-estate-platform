import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { patchSavedSearchSchema } from '@/lib/saved-searches/schemas'

const paramsSchema = z.object({
  id: z.string().uuid('id must be a UUID'),
})

/** Postgres unique-violation error code, raised on `UNIQUE (user_id, filters_hash)`. */
const UNIQUE_VIOLATION = '23505'
/** PostgREST "no rows" error code, raised by `.single()` when 0 rows match. */
const NO_ROWS = 'PGRST116'

type RouteContext = { params: Promise<{ id: string }> }

// ── PATCH /api/saved-searches/[id] ─────────────────────────────────────────

/**
 * PATCH /api/saved-searches/[id]
 *
 * Body: { name?, filters?, alertFrequency?, newMatchCount? } — validated by
 * `patchSavedSearchSchema`. Ownership is verified via the `.eq('user_id')`
 * guard (defence in depth on top of RLS).
 * 200 { updated: true } · 401 auth_required · 404 not owned/found ·
 * 409 duplicate (filters edit collides with another saved search) ·
 * 422 validation_error.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: { id: string }
  try {
    resolvedParams = paramsSchema.parse(await params)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_params', fields: err.flatten().fieldErrors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof patchSavedSearchSchema.parse>
  try {
    input = patchSavedSearchSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const update: Record<string, unknown> = {}
    if (input.name !== undefined) update.name = input.name
    if (input.filters !== undefined) update.filters = input.filters
    if (input.alertFrequency !== undefined) update.alert_frequency = input.alertFrequency
    if (input.newMatchCount !== undefined) update.new_match_count = input.newMatchCount

    const result = await supabase
      .from('saved_searches')
      .update(update as unknown as never)
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id) // RLS: owner only — explicit guard is self-documenting
      .select('id')
      .single()

    if (result.error) {
      if (result.error.code === NO_ROWS) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      if (result.error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ error: 'duplicate' }, { status: 409 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    if (!result.data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ updated: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

// ── DELETE /api/saved-searches/[id] ────────────────────────────────────────

/**
 * DELETE /api/saved-searches/[id]
 *
 * Hard-deletes the saved search. Undo is a client-side re-`POST`, not a
 * server-side "undo" endpoint (matches the Favorites undo pattern).
 * 200 { deleted: true } · 401 auth_required · 404 not owned/found.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: { id: string }
  try {
    resolvedParams = paramsSchema.parse(await params)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_params', fields: err.flatten().fieldErrors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id) // RLS: owner only — explicit guard is self-documenting
      .select('id')

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    if (!data || (data as unknown[]).length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
