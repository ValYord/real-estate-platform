import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { privacyPatchSchema } from '@/lib/settings/schemas'
import { mergePrivacy } from '@/lib/settings/mergePrefs'
import type { PrivacySettings } from '@/lib/settings/types'

/**
 * PATCH /api/users/me/privacy
 * Instant-save endpoint for the Privacy tab (§3.6). Accepts a partial patch
 * and merges it into the existing `privacy` JSONB column.
 *
 * Body examples:
 *   { "hidePhone": true }
 *   { "contactPreference": "registered" }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  const parsed = privacyPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('privacy')
    .eq('id', user.id)
    .single()

  const merged = mergePrivacy(
    (existing as { privacy: PrivacySettings | null } | null)?.privacy,
    parsed.data,
  )

  const { error } = await supabase
    .from('profiles')
    .update({ privacy: merged, updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, privacy: merged })
}
