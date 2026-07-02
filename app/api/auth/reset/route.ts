import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { Database } from '@/types/database'

const resetBodySchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
})

/**
 * POST /api/auth/reset
 *
 * Consumes a password-reset token and updates the user's password.
 * All active sessions are invalidated on success.
 *
 * Body: { token: string, password: string }
 *
 * Status codes:
 *   200 { ok: true }
 *   410 { error: 'token_invalid' }
 *   422 { error: 'validation' }
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = resetBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { token, password } = parsed.data

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

  // Exchange the recovery token for a session first
  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  })

  if (otpError) {
    return NextResponse.json({ error: 'token_invalid' }, { status: 410 })
  }

  // Update the password — this also invalidates all other sessions
  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  // Sign out of the current session too; the user will re-login after reset
  await supabase.auth.signOut({ scope: 'global' })

  return NextResponse.json({ ok: true })
}
