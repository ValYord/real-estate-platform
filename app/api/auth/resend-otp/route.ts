import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { resendOtpSchema } from '@/lib/auth/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'
import type { Database } from '@/types/database'

/**
 * POST /api/auth/resend-otp
 *
 * Re-sends the OTP for email or phone verification.
 * Enforces a 60-second cooldown per user per channel.
 *
 * Body: { channel: 'email' | 'phone' }
 *
 * Status codes:
 *   200 { cooldown: 60 }
 *   429 { error: 'rate_limited' }
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = resendOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { channel } = parsed.data
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  // 60-second cooldown per IP+channel
  const rl = checkRateLimit(
    `otp_resend:${ip}:${channel}`,
    LIMITS.OTP_RESEND.max,
    LIMITS.OTP_RESEND.windowMs
  )
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Get the current session to know the user's email/phone
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  if (channel === 'email' && user.email) {
    await supabase.auth.resend({ type: 'signup', email: user.email })
  } else if (channel === 'phone' && user.phone) {
    await supabase.auth.signInWithOtp({ phone: user.phone })
  }

  return NextResponse.json({ cooldown: 60 })
}
