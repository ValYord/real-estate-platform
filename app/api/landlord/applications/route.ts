import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createApplicationLinkSchema } from '@/lib/landlord/schemas'
import { generateApplyToken } from '@/lib/landlord/applicationToken'
import type { ApplicationLinkResponse, ApplicationsResponse, TenantApplicationSummary } from '@/lib/landlord/types'
import type { TenantApplicationStatus } from '@/types/database'

interface ApplicationRow {
  id: string
  unit_id: string
  applicant_name: string
  contact: string
  employment: string | null
  income: number | null
  residence: string | null
  references_info: string | null
  declaration: string | null
  consent: boolean
  status: TenantApplicationStatus
  notes: string | null
  created_at: string
  rental_units: { address: string } | null
}

function rowToSummary(row: ApplicationRow): TenantApplicationSummary {
  return {
    id: row.id,
    unitId: row.unit_id,
    unitAddress: row.rental_units?.address ?? '—',
    applicantName: row.applicant_name,
    contact: row.contact,
    employment: row.employment,
    income: row.income,
    residence: row.residence,
    references: row.references_info,
    declaration: row.declaration,
    consent: row.consent,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

/**
 * GET /api/landlord/applications
 *
 * The landlord's applications inbox (§3.3 "Applications inbox"). Optional
 * `?unit=<id>` and `?status=<status>` filters. RLS on `tenant_applications`
 * (owner-scoped through the owning `rental_units` row — see
 * 0015_landlord_screening_lease.sql) guarantees this can never return
 * another landlord's applications even if the query below were widened.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unit = searchParams.get('unit')
    const status = searchParams.get('status')

    let query = supabase
      .from('tenant_applications')
      .select(
        'id, unit_id, applicant_name, contact, employment, income, residence, references_info, declaration, consent, status, notes, created_at, rental_units!tenant_applications_unit_id_fkey(address)',
      )
      .order('created_at', { ascending: false })

    if (unit) query = query.eq('unit_id', unit)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const items = ((data ?? []) as unknown as ApplicationRow[]).map(rowToSummary)
    const response: ApplicationsResponse = { items }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/**
 * POST /api/landlord/applications
 *
 * Body: `{ unitId }`. Creates (or reuses) the unit's shareable application
 * link — `rental_units.apply_token` normally already exists (DB-side
 * default, see the migration), this only lazily backfills a null token.
 * 201 `{ applicationLink }` · 401 auth_required · 404 not_found (unit
 * doesn't exist or isn't owned by the caller) · 422 validation_error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof createApplicationLinkSchema.parse>
  try {
    input = createApplicationLinkSchema.parse(body)
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

    const { data: unit, error: unitError } = await supabase
      .from('rental_units')
      .select('id, apply_token')
      .eq('id', input.unitId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (unitError) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    if (!unit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    let token = (unit as unknown as { apply_token: string | null }).apply_token
    if (!token) {
      token = generateApplyToken()
      const { error: updateError } = await supabase
        .from('rental_units')
        .update({ apply_token: token } as unknown as never)
        .eq('id', input.unitId)

      if (updateError) {
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    }

    const origin = new URL(request.url).origin
    const response: ApplicationLinkResponse = { applicationLink: `${origin}/apply/${token}` }

    return NextResponse.json(response, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
