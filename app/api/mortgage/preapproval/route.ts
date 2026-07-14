import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { preApprovalSchema } from '@/lib/mortgage/rates/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'

/**
 * POST /api/mortgage/preapproval
 *
 * Body: see lib/mortgage/rates/schemas.ts `preApprovalSchema` (docs/design/
 * 14-mortgage-rates-handoff.md §5.5). Fork of app/api/agent-leads/route.ts
 * almost verbatim (D8) — same shape, different table/schema.
 *
 * Auth: required — returns 401 when the caller is not authenticated. The
 * client pre-emptively redirects guests to /auth/login?next=... before ever
 * calling this route (D7); this 401 is defense-in-depth for direct callers.
 * Rate-limit: 5 requests per hour per user (429).
 *
 * 201 { leadId } · 401 auth_required · 422 validation_error · 429 rate_limited
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof preApprovalSchema.parse>
  try {
    input = preApprovalSchema.parse(body)
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
    return NextResponse.json({ leadId: 'discarded' }, { status: 201 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project-id')) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  try {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const rate = checkRateLimit(
      `mortgage-preapproval:${user.id}`,
      LIMITS.MORTGAGE_PREAPPROVAL.max,
      LIMITS.MORTGAGE_PREAPPROVAL.windowMs,
    )
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const insertResult = await supabase
      .from('preapproval_leads')
      .insert({
        user_id: user.id,
        name: input.name,
        phone: input.phone,
        loan_amount: input.loanAmount,
        country: input.country ?? null,
        currency: input.currency ?? null,
        consent: input.consent,
      } as unknown as never)
      .select('id')
      .single()

    if (insertResult.error) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const row = insertResult.data as unknown as { id: string } | null
    if (!row) {
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ leadId: row.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
