import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createLeaseSchema } from '@/lib/landlord/schemas'
import type { CreateLeaseResponse } from '@/lib/landlord/types'

/** Postgres foreign-key-violation error code (bad templateId/applicationId). */
const FOREIGN_KEY_VIOLATION = '23503'

/**
 * POST /api/landlord/leases
 *
 * Body: `{ unitId, templateId, applicationId?, fields }` — validated by
 * `createLeaseSchema` (§5, including the `endDate > startDate` refinement).
 * Backs both the `[Generate / Preview]` and `[💾 Save draft]` actions on
 * `/landlord/lease` (§3.4) — both persist a `status: 'draft'` row here; the
 * PDF itself is rendered on demand by GET /api/landlord/leases/[id]/pdf
 * rather than uploaded to Storage (see the migration's header note).
 *
 * 201 `{ leaseId, pdfUrl }` · 401 auth_required · 404 not_found (unit not
 * owned by the caller) · 422 validation_error | invalid_reference (bad
 * templateId/applicationId).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof createLeaseSchema.parse>
  try {
    input = createLeaseSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', field: err.issues[0]?.path.join('.'), fields: err.flatten().fieldErrors },
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

    const { data: unit, error: unitError } = await supabase
      .from('rental_units')
      .select('id')
      .eq('id', input.unitId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (unitError) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    if (!unit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const insertResult = await supabase
      .from('leases')
      .insert({
        owner_id: user.id,
        unit_id: input.unitId,
        template_id: input.templateId,
        application_id: input.applicationId ?? null,
        fields: input.fields,
        status: 'draft',
      } as unknown as never)
      .select('id')
      .single()

    if (insertResult.error) {
      if (insertResult.error.code === FOREIGN_KEY_VIOLATION) {
        return NextResponse.json({ error: 'invalid_reference' }, { status: 422 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const leaseId = (insertResult.data as unknown as { id: string }).id
    const response: CreateLeaseResponse = { leaseId, pdfUrl: `/api/landlord/leases/${leaseId}/pdf` }

    return NextResponse.json(response, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
