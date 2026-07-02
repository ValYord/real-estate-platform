import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyEmailSchema } from '@/lib/auth/schemas'
import type { Database } from '@/types/database'

/**
 * POST /api/auth/verify-email
 *
 * Verifies the 6-digit email OTP sent after registration.
 *
 * Body: { email: string, code: string }
 *
 * Status codes:
 *   200 { verified: true }
 *   400 { error: 'invalid_code' }
 *   410 { error: 'expired' }
 *   422 { error: 'validation' }
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = verifyEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { email, code } = parsed.data

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

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'signup',
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('expired') || msg.includes('invalid otp')) {
      return NextResponse.json({ error: 'expired' }, { status: 410 })
    }
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  return NextResponse.json({ verified: true })
}
