import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { tourRequestSchema } from '@/lib/tours/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'

/**
 * POST /api/tours
 *
 * Body: see lib/tours/schemas.ts `tourRequestSchema`
 * (docs/design/27-schedule-tour-handoff.md §6/§7).
 *
 * Auth: OPTIONAL — unlike every other POST route in app/api, this endpoint
 * deliberately allows an anonymous (guest) caller through. Guests supply
 * `name`/`phone` directly in the form instead of relying on session data
 * (task requirement: "Guests can submit the form... and are not forced to
 * log in"). Do not "fix" this back to a 401 — it is intentional, see §6.4.
 * Rate-limit: 5 requests per hour, keyed by user id (logged-in) or by IP
 * (guest) — 429 when exceeded.
 *
 * 201 { id } · 400 invalid_json | property_inactive · 404 not_found
 * 409 already_requested · 422 validation_error { fields } · 429 rate_limited
 * 500 server_error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof tourRequestSchema.parse>
  try {
    input = tourRequestSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Honeypot: silently accept but do nothing (bots get a fake success).
  if (input.website) {
    return NextResponse.json({ id: 'discarded' }, { status: 201 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project-id')) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    // Intentionally not gated on auth — see the doc comment above.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const rateKey = user
      ? `tour:user:${user.id}`
      : `tour:ip:${request.headers.get('x-forwarded-for') ?? 'unknown'}`
    const rate = checkRateLimit(rateKey, LIMITS.TOUR_REQUEST.max, LIMITS.TOUR_REQUEST.windowMs)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    // Look up the property server-side — never trust a client-supplied owner id.
    type PropertyRow = { id: string; owner_id: string; status: string }
    const propertyResult = await supabase
      .from('properties')
      .select('id, owner_id, status')
      .eq('id', input.propertyId)
      .single()

    const property = propertyResult.data as PropertyRow | null
    if (propertyResult.error || !property) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    if (property.status !== 'active' && property.status !== 'pending') {
      return NextResponse.json({ error: 'property_inactive' }, { status: 400 })
    }

    // Insert via the admin (service-role) client — required because guest
    // rows need requester_id = NULL, which only a service-role context can
    // safely accept alongside logged-in users' rows through one code path.
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()

    const insertResult = await adminSupabase
      .from('tours')
      .insert({
        property_id: input.propertyId,
        owner_id: property.owner_id,
        requester_id: user?.id ?? null,
        tour_type: input.tourType,
        requested_at: input.requestedAt,
        name: input.name,
        phone: input.phone,
        note: input.note ?? null,
      })
      .select('id')
      .single()

    if (insertResult.error) {
      if (insertResult.error.code === '23505') {
        return NextResponse.json({ error: 'already_requested' }, { status: 409 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const row = insertResult.data
    if (!row) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    // Best-effort owner notification — a failure here must not fail the
    // request; the tour row itself is the source of truth.
    await adminSupabase.from('notifications').insert({
      user_id: property.owner_id,
      type: 'tour_requested',
      title: 'Tour requested',
      body: `${input.name} requested a ${input.tourType === 'video' ? 'video' : 'in-person'} tour`,
      metadata: {
        propertyId: input.propertyId,
        name: input.name,
        requestedAt: input.requestedAt,
        tourType: input.tourType,
      },
    })

    return NextResponse.json({ id: row.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
