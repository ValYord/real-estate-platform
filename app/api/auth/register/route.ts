import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { registerSchema } from '@/lib/auth/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'
import type { Database } from '@/types/database'

/**
 * POST /api/auth/register
 *
 * Creates a new Supabase auth user and inserts a matching profile row.
 * Uses the anon-key signUp to trigger the built-in confirmation OTP email,
 * and the admin client to insert the profile (bypasses RLS pre-login).
 *
 * Status codes:
 *   201 { userId, nextStep: 'verify' }
 *   409 { error: 'email_taken' }
 *   422 { error: 'validation', fields: { … } }
 *   429 { error: 'rate_limited' }
 */
export async function POST(request: NextRequest) {
  // Rate-limit by IP (5 registrations per hour)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rl = checkRateLimit(
    `register:${ip}`,
    LIMITS.REGISTER.max,
    LIMITS.REGISTER.windowMs
  )
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  // Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const fields = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [
        k,
        v?.[0] ?? 'Invalid',
      ])
    )
    return NextResponse.json({ error: 'validation', fields }, { status: 422 })
  }

  const { role, name, email, phone, password, agencyName, marketing } =
    parsed.data

  // Use the anon-key server client so signUp sends the confirmation OTP email.
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
          cookiesToSet.forEach(({ name: cookieName, value, options }) => {
            cookieStore.set(cookieName, value, options)
          })
        },
      },
    }
  )

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        role,
        phone,
        agency_name: agencyName ?? null,
        marketing,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
    },
  })

  if (signUpError) {
    const msg = signUpError.message.toLowerCase()
    if (
      msg.includes('already') ||
      msg.includes('registered') ||
      msg.includes('exists') ||
      msg.includes('taken')
    ) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'signup_failed' }, { status: 500 })
  }

  // Supabase returns a session even for unconfirmed users in some configs.
  // When email confirmation is required, user exists but session is null.
  const userId = signUpData.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  }

  // Insert profile using admin client (bypasses RLS; user isn't authed yet).
  const admin = createAdminClient()
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    full_name: name,
    phone,
    role,
  })

  if (profileError && !profileError.message.includes('duplicate')) {
    // Non-conflict profile errors — attempt cleanup
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'profile_failed' }, { status: 500 })
  }

  return NextResponse.json({ userId, nextStep: 'verify' }, { status: 201 })
}
