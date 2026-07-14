import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

export interface AdminIdentity {
  id: string
  fullName: string | null
}

export interface AdminGuardResult {
  /** Cookie-scoped Supabase client for the verified admin's own session (RLS applies). */
  supabase: Awaited<ReturnType<typeof createServerClient>>
  admin: AdminIdentity
}

// Supabase type inference cannot resolve this narrow-select shape reliably
// (same convention as app/[locale]/dashboard/layout.tsx) — declared
// explicitly and cast below.
type ProfileRoleRow = { role: string; full_name: string | null }

/**
 * Server-side admin guard for the whole /admin surface (Page 24).
 *
 * Verifies the current session belongs to a `role === 'admin'` profile.
 * Returns `null` for BOTH "no session" and "authenticated but not admin" —
 * callers render the identical 403 page either way, so the distinction is
 * intentionally erased here rather than leaked to the caller.
 *
 * Used by:
 *   - app/[locale]/admin/layout.tsx — renders the 403 content in place (no
 *     `redirect()`), which is what the acceptance criteria require: a
 *     non-admin must never see a flash of admin content before being
 *     bounced, so the check and the branch both happen server-side before
 *     any admin children are returned.
 *   - every /api/admin/* route handler — defense-in-depth on top of the
 *     `is_admin()`-gated Supabase RLS policies added in
 *     0012_admin_moderation.sql.
 */
export async function requireAdmin(): Promise<AdminGuardResult | null> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileData as unknown as ProfileRoleRow | null

  if (!profile || profile.role !== 'admin') return null

  return {
    supabase,
    admin: { id: user.id, fullName: profile.full_name },
  }
}
