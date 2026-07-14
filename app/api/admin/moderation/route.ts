import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import { getPendingModerationQueue } from '@/lib/admin/queries'
import type { ModerationListResponse } from '@/lib/admin/types'

/**
 * GET /api/admin/moderation
 *
 * Pending listings, oldest first (FIFO queue) — powers ModerationQueue.tsx's
 * React Query list and its post-mutation refetch (so approve/reject update
 * the UI without a full page reload). Not in the design handoff's original
 * API inventory (only stats/approve/reject were listed there); added here
 * because the client component needs a data source and the handoff's own
 * text describes it as "React Query list" — noted as a scope addition in
 * the PR description.
 */
export async function GET(): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const items = await getPendingModerationQueue(guard.supabase)
    const response: ModerationListResponse = { items }
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
}
