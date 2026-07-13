import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { patchUserSchema, deleteAccountSchema } from '@/lib/settings/schemas'
import { DEFAULT_NOTIFICATION_PREFS, DEFAULT_PRIVACY } from '@/lib/settings/defaults'
import type { NotificationPrefs, PrivacySettings, UserMe } from '@/lib/settings/types'
import type { Currency, Locale, Theme, UserRole } from '@/types/database'

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: UserRole
  bio: string | null
  phone_verified: boolean
  lang: Locale
  currency: Currency
  theme: Theme
  notification_prefs: unknown
  privacy: unknown
}

const PROFILE_SELECT =
  'id, full_name, avatar_url, phone, role, bio, phone_verified, lang, currency, theme, notification_prefs, privacy'

/** Builds the GET /api/users/me response shape from the auth user + profile row. */
function toUserMe(
  authUser: { id: string; email?: string | null; email_confirmed_at?: string | null },
  profile: ProfileRow,
): UserMe {
  return {
    id: authUser.id,
    role: profile.role,
    name: profile.full_name ?? '',
    email: authUser.email ?? '',
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    lang: profile.lang,
    currency: profile.currency,
    theme: profile.theme,
    emailVerified: !!authUser.email_confirmed_at,
    phoneVerified: profile.phone_verified,
    notificationPrefs: (profile.notification_prefs as NotificationPrefs | null) ?? DEFAULT_NOTIFICATION_PREFS,
    privacy: (profile.privacy as PrivacySettings | null) ?? DEFAULT_PRIVACY,
  }
}

/**
 * GET /api/users/me
 * Returns the current user's settings profile. SSR-loaded by the Settings
 * layout and re-fetched client-side after mutations that need a fresh copy.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(toUserMe(user, profile as unknown as ProfileRow))
}

/**
 * PATCH /api/users/me
 * Partial update of the Profile (name/phone/bio) and Preferences
 * (lang/currency/theme) tabs. See docs/en/pages/21-settings.md §5.
 *
 * A phone change resets `phone_verified` and reports it back in `reverify`
 * so the client can show the "must be re-verified" banner (§3.2).
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

  let parsed: ReturnType<typeof patchUserSchema.parse>
  try {
    parsed = patchUserSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of err.issues) {
        fields[issue.path.join('.')] = issue.message
      }
      return NextResponse.json({ error: 'validation', fields }, { status: 422 })
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  if (Object.keys(parsed).length === 0) {
    return NextResponse.json({ error: 'validation', fields: {} }, { status: 422 })
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .single()

  const reverify: string[] = []
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (parsed.name !== undefined) update.full_name = parsed.name
  if (parsed.bio !== undefined) update.bio = parsed.bio
  if (parsed.lang !== undefined) update.lang = parsed.lang
  if (parsed.currency !== undefined) update.currency = parsed.currency
  if (parsed.theme !== undefined) update.theme = parsed.theme
  if (parsed.phone !== undefined) {
    update.phone = parsed.phone
    const existingPhone = (existing as { phone: string | null } | null)?.phone
    if (parsed.phone !== existingPhone) {
      update.phone_verified = false
      reverify.push('phone')
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(update as unknown as never)
    .eq('id', user.id) // RLS also enforces this — belt & suspenders.

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reverify })
}

/**
 * DELETE /api/users/me
 * Danger-zone account deletion (§3.3). Requires the literal body
 * `{ "confirm": "DELETE" }` — enforced by the client's typed-confirmation
 * modal AND re-validated here server-side.
 *
 * Phase 1 performs a hard delete (auth user + cascading profile row via the
 * `profiles_id_fkey ... ON DELETE CASCADE` constraint). The soft-delete
 * grace period described in the spec is a Phase 2 concern.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
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

  const parsed = deleteAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  // Deleting the auth user requires the service-role key — server-only,
  // never reachable from client code (see lib/supabase/admin.ts).
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  await supabase.auth.signOut()

  return NextResponse.json({ deleted: true })
}
