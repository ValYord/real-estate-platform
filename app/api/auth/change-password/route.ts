import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { changePasswordRequestSchema } from '@/lib/settings/schemas'

/**
 * POST /api/auth/change-password
 * Account tab (§3.3, Scenario B). Verifies the current password by
 * re-authenticating with it (Supabase has no standalone "verify password"
 * call), then updates to the new password. Optionally revokes every other
 * active session ("Sign out other devices" checkbox).
 *
 * Body: { current, new, confirm, revokeOthers? }
 * 200 { ok: true } · 401 { error: 'wrong_current' } · 422 { error: 'validation' }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = changePasswordRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { current, new: newPassword, revokeOthers } = parsed.data

  // Verify the current password by attempting to sign in with it.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  })

  if (signInError) {
    return NextResponse.json({ error: 'wrong_current' }, { status: 401 })
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

  if (updateError) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  if (revokeOthers) {
    // 'others' revokes every session except the one making this request.
    await supabase.auth.signOut({ scope: 'others' })
  }

  return NextResponse.json({ ok: true })
}
