import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { agentLeadSchema } from '@/lib/agent/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'

/**
 * POST /api/agent-leads
 *
 * Body: see lib/agent/schemas.ts `agentLeadSchema` (docs/en/pages/10 §5).
 * Auth: required — returns 401 when the caller is not authenticated (Guest →
 * login modal with ?next, per the profile page contact card).
 * Rate-limit: 5 requests per hour per user (429).
 *
 * 201 { leadId } · 401 auth_required · 404 not_found (unknown agent)
 * 422 validation_error · 429 rate_limited
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof agentLeadSchema.parse>
  try {
    input = agentLeadSchema.parse(body)
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

    const rate = checkRateLimit(`agent-lead:${user.id}`, LIMITS.AGENT_LEAD.max, LIMITS.AGENT_LEAD.windowMs)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
    }

    const agentResult = await supabase
      .from('agents')
      .select('user_id')
      .eq('user_id', input.agentId)
      .single()

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const insertResult = await supabase
      .from('agent_leads')
      .insert({
        agent_id: input.agentId,
        user_id: user.id,
        deal_type: input.dealType,
        property_type: input.propertyType,
        city: input.city,
        budget_min: input.budgetMin,
        budget_max: input.budgetMax,
        currency: input.currency,
        rooms: input.rooms,
        name: input.name,
        phone: input.phone,
        message: input.message,
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
