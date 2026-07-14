import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import { getDashboardStats } from '@/lib/admin/queries'

/**
 * GET /api/admin/stats
 *
 * Real Supabase counts for the Dashboard's 3 stat cards (D1 in the design
 * handoff: no charts/date-range/revenue — MVP scope only). Also backs the
 * sidebar's Moderation badge (`attention`), refetched by the client every
 * 30s.
 *
 * 403 { error: 'forbidden' } for non-admins (mirrors docs/en/pages/24-admin.md
 * §5's API contract).
 */
export async function GET(): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const stats = await getDashboardStats(guard.supabase)
  return NextResponse.json(stats)
}
