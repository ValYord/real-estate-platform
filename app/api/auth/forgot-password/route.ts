import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { forgotPasswordSchema } from '@/lib/auth/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email if the account exists.
 * ALWAYS returns 200 { ok: true } regardless of whether the email exists,
 * to prevent email enumeration attacks.
 *
 * Body: { email: string }
 *
 * Status codes:
 *   200 { ok: true }          — always (enumeration-resistant)
 *   429 { error: 'rate_limited' }
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  let body: unknown
  try {
    body = await request.json()
  } catch {
    // Still return 200 to be enumeration-resistant
    return NextResponse.json({ ok: true })
  }

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    // Return 200 for enumeration-resistance (bad email format = no account anyway)
    return NextResponse.json({ ok: true })
  }

  const { email } = parsed.data

  // Rate-limit by email (3 per hour) and IP (soft limit)
  const emailRl = checkRateLimit(
    `forgot:email:${email}`,
    LIMITS.FORGOT.max,
    LIMITS.FORGOT.windowMs
  )
  const ipRl = checkRateLimit(
    `forgot:ip:${ip}`,
    LIMITS.FORGOT.max * 3,
    LIMITS.FORGOT.windowMs
  )

  if (!emailRl.allowed || !ipRl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  // Attempt to send the reset email — fire and forget (don't await result
  // in a way that leaks whether the email exists).
  const supabase = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  // generateLink sends the reset email; if the user doesn't exist, Supabase
  // simply returns an error which we intentionally ignore.
  await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/reset`,
    },
  })

  return NextResponse.json({ ok: true })
}
