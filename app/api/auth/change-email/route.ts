import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { changeEmailSchema } from '@/lib/settings/schemas'

/**
 * POST /api/auth/change-email
 * Account tab (§3.3). Starts Supabase's built-in email-change flow, which
 * sends a confirmation link to the new address (and — when the Supabase
 * project has "Secure email change" enabled — a confirmation link to the
 * old address too, satisfying the spec's dual-confirmation requirement).
 * The email only updates once the confirmation link is followed, so
 * `email_verified` naturally goes back to "pending" until then.
 *
 * Body: { newEmail }
 * 200 { confirmationSent: true } · 409 { error: 'email_taken' } · 422 { error: 'validation' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = changeEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { error } = await supabase.auth.updateUser({ email: parsed.data.newEmail })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists') || msg.includes('taken')) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ confirmationSent: true })
}
