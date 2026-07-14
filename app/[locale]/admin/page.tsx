import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/guard'
import { getDashboardStats } from '@/lib/admin/queries'
import DashboardStats from '@/components/admin/DashboardStats'

export const metadata: Metadata = {
  title: 'Dashboard · Admin | RE Platform',
}

/**
 * /admin — Dashboard (§4.3 of docs/design/24-admin-handoff.md). 3 real
 * Supabase-backed stat cards: Users, Listings (by status breakdown),
 * Attention (pending moderation). No charts/date-range/revenue (D1 — MVP
 * scope cut).
 */
export default async function AdminDashboardPage() {
  // The layout above already ran this guard and would have rendered the 403
  // page instead of `children` for a non-admin — this second call only
  // fetches a request-scoped Supabase client for the SSR data fetch below
  // (same pattern app/[locale]/dashboard/{layout,page}.tsx already use).
  const guard = await requireAdmin()
  if (!guard) return null

  const initialStats = await getDashboardStats(guard.supabase)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <DashboardStats initialStats={initialStats} />
    </div>
  )
}
