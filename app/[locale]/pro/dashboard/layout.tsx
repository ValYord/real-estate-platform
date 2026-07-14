import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import ProDashboardShell from '@/components/pro/ProDashboardShell'
import type { PlanTier } from '@/lib/plans/types'

export const metadata: Metadata = {
  title: 'Pro dashboard | RE Platform',
  // Private, auth-gated retention page — never indexed (page spec §8).
  robots: { index: false, follow: false },
}

/**
 * Auth-gated SSR shell for Page 18 (Pro Dashboard). MVP scope only: shell +
 * Overview (§3.1) + Analytics (§3.2) — see
 * docs/design/18-pro-dashboard-handoff.md §0 for what's explicitly out of
 * scope (Leads/Promoted/Bulk Upload/Team/Billing).
 *
 * `/pro/dashboard` is also listed in `PROTECTED_PATHS`
 * (lib/auth/protectedPaths.ts) so the middleware already redirects guests
 * before this ever renders; the `redirect()` below is defense in depth,
 * mirroring `app/[locale]/messages/layout.tsx` exactly (same rule: protected
 * routes verify the session server-side too, per CLAUDE.md).
 *
 * Reads `profiles.tier` once — the same tier source of truth `/pro`'s
 * `loadPlans()` already uses (handoff D2), not a parallel tier/subscription
 * table. Free-tier callers are NOT redirected away from the shell: only the
 * `/api/pro/*` route handlers block their data (403 `tier_insufficient`),
 * and the widgets render a locked/blurred `<UpgradeOverlay>` from that
 * response (page spec §4 "Free tier").
 */
export default async function ProDashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/pro/dashboard')
  }

  type ProfileRow = { tier: PlanTier }
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle()

  const tier = (profile as ProfileRow | null)?.tier ?? 'free'

  return <ProDashboardShell tier={tier}>{children}</ProDashboardShell>
}
