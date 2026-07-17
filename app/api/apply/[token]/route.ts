import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { applicationSchema } from '@/lib/landlord/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'

type Params = { token: string }
type RouteContext = { params: Promise<Params> }

const tokenParamSchema = z.object({ token: z.string().min(1).max(200) })

/**
 * POST /api/apply/[token]
 *
 * Public, unauthenticated endpoint backing the `/apply/[token]` tenant
 * application form (docs/en/pages/19-landlord.md §3.3). Looks the owning
 * unit up by its `apply_token` bearer capability (never the unit's id —
 * see 0015_landlord_screening_lease.sql) and inserts a `tenant_applications`
 * row via the service-role client: an anonymous applicant has no Supabase
 * session, so there is no RLS `WITH CHECK` they could satisfy — same
 * reasoning as `POST /api/home-value/estimate`.
 *
 * 201 `{ ok: true }` · 400 invalid_json · 404 not_found (bad/expired token)
 * · 422 validation_error (includes the required-consent-checkbox case,
 * §5 "Consent gating") · 429 rate_limited.
 */
export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: Params
  try {
    resolvedParams = tokenParamSchema.parse(await params)
  } catch {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rate = checkRateLimit(
    `apply:${ip}`,
    LIMITS.TENANT_APPLICATION.max,
    LIMITS.TENANT_APPLICATION.windowMs,
  )
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof applicationSchema.parse>
  try {
    input = applicationSchema.parse(body)
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
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()

    const { data: unit, error: unitError } = await admin
      .from('rental_units')
      .select('id')
      .eq('apply_token', resolvedParams.token)
      .maybeSingle()

    if (unitError) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
    if (!unit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const { error: insertError } = await admin.from('tenant_applications').insert({
      unit_id: unit.id,
      applicant_name: input.applicantName,
      contact: input.contact,
      employment: input.employment ? input.employment : null,
      income: input.income ?? null,
      residence: input.residence ? input.residence : null,
      references_info: input.references ? input.references : null,
      declaration: input.declaration ? input.declaration : null,
      consent: input.consent,
      status: 'new',
    } as unknown as never)

    if (insertError) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
