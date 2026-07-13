import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { checkoutSchema } from '@/lib/plans/schemas'
import type { CheckoutResponse } from '@/lib/plans/types'

/**
 * POST /api/plans/checkout
 *
 * Stub checkout endpoint for Page 17 (/pro) — this MVP does not integrate
 * Stripe. Validates the request body and the caller's Supabase session, then
 * returns a typed placeholder so the client CTA has something real to branch
 * on once real checkout ships later.
 *
 * Body:   { tier: 'free' | 'pro' | 'premium', cycle: 'monthly' | 'annual' }
 * 200 { status: 'not_implemented', tier, cycle }
 * 400 { error: 'invalid_json' }
 * 401 { error: 'auth_required' }
 * 422 { error: 'validation_error', fields }
 * 500 { error: 'server_error' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    const fields = Object.fromEntries(
      Object.entries((parsed.error as ZodError).flatten().fieldErrors).map(([key, messages]) => [
        key,
        messages?.[0] ?? 'Invalid',
      ])
    )
    return NextResponse.json({ error: 'validation_error', fields }, { status: 422 })
  }

  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const response: CheckoutResponse = {
      status: 'not_implemented',
      tier: parsed.data.tier,
      cycle: parsed.data.cycle,
    }
    return NextResponse.json(response, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
