import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { applicationPatchSchema } from '@/lib/landlord/schemas'

type Params = { id: string }
type RouteContext = { params: Promise<Params> }

const idParamSchema = z.object({ id: z.string().uuid() })

interface OwnerRow {
  id: string
  rental_units: { owner_id: string } | null
}

/**
 * Looks an application's owning landlord up with the service-role client
 * (bypasses RLS) so the route can tell "not found" (404) apart from
 * "belongs to another landlord" (403) — same pattern as
 * app/api/notifications/[id]/route.ts's `resolveOwner`. RLS alone would
 * silently filter a cross-owner id to zero rows, indistinguishable from
 * "doesn't exist".
 */
async function resolveOwner(
  id: string,
): Promise<{ ok: true; ownerId: string } | { ok: false; status: 404 | 500 }> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tenant_applications')
    .select('id, rental_units!tenant_applications_unit_id_fkey(owner_id)')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, status: 500 }
  if (!data) return { ok: false, status: 404 }

  const row = data as unknown as OwnerRow
  if (!row.rental_units) return { ok: false, status: 404 }
  return { ok: true, ownerId: row.rental_units.owner_id }
}

/**
 * PATCH /api/landlord/applications/[id]
 *
 * Body: `{ status, notes? }` — the `[Approve]` / `[Reject]` + notes action
 * (§3.3 "Application detail"). Auth required (401); ownership checked
 * explicitly (see resolveOwner) → 403 not_owner for a cross-landlord id.
 * The actual mutation goes through the RLS-scoped client as an additional,
 * authoritative enforcement layer.
 *
 * 200 `{ ok: true }` · 401 auth_required · 403 not_owner · 404 not_found ·
 * 422 validation_error.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: Params
  try {
    resolvedParams = idParamSchema.parse(await params)
  } catch {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof applicationPatchSchema.parse>
  try {
    input = applicationPatchSchema.parse(body)
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

    const ownership = await resolveOwner(resolvedParams.id)
    if (!ownership.ok) {
      return NextResponse.json(
        { error: ownership.status === 404 ? 'not_found' : 'server_error' },
        { status: ownership.status },
      )
    }
    if (ownership.ownerId !== user.id) {
      return NextResponse.json({ error: 'not_owner' }, { status: 403 })
    }

    const { error } = await supabase
      .from('tenant_applications')
      .update({
        status: input.status,
        notes: input.notes ? input.notes : null,
      } as unknown as never)
      .eq('id', resolvedParams.id)

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
