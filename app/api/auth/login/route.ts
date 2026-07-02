import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { loginSchema } from '@/lib/auth/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'
import type { Database } from '@/types/database'

/**
 * POST /api/auth/login
 *
 * Authenticates the user with email + password.
 *
 * Status codes:
 *   200 { userId, emailVerified }
 *   401 { error: 'invalid_credentials' }  — generic, no email/password differentiation
 *   403 { error: 'email_unverified' }
 *   429 { error: 'rate_limited' }
 */
export async function POST(request: NextRequest) {
  // Rate-limit by IP + email (5 attempts per 15 min)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const { email, password } = parsed.data

  const rl = checkRateLimit(
    `login:${ip}:${email}`,
    LIMITS.LOGIN.max,
    LIMITS.LOGIN.windowMs
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    // Check if the error is because email is not confirmed
    if (error?.message?.toLowerCase().includes('email not confirmed')) {
      return NextResponse.json({ error: 'email_unverified' }, { status: 403 })
    }
    // All other errors get a generic 401 to prevent credential enumeration
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const emailVerified = !!data.user.email_confirmed_at

  return NextResponse.json(
    { userId: data.user.id, emailVerified },
    { status: 200 }
  )
}
