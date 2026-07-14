import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import type { ModerationActionResponse } from '@/lib/admin/types'

type RouteContext = { params: Promise<{ id: string }> }
type StatusRow = { id: string; status: string }

/**
 * POST /api/admin/listings/[id]/approve
 *
 * Sets status=active. Idempotent: the UPDATE is conditioned on
 * `status = 'pending'`, so a second submit (e.g. two admins racing on the
 * same item) never double-applies — it just returns 0 rows, which is
 * distinguished from "doesn't exist" by a follow-up lookup:
 *   - not found at all              → 404 { error: 'not_found' }
 *   - found but no longer 'pending' → 409 { error: 'already_moderated' }
 *
 * Every successful approval writes an admin_actions audit row.
 */
export async function POST(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { id } = await params
  const guard = await requireAdmin()
  if (!guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { supabase, admin } = guard

  const updateResult = await supabase
    .from('properties')
    .update({ status: 'active', updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, status')
    .maybeSingle()

  if (updateResult.error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!updateResult.data) {
    const existing = await supabase.from('properties').select('id, status').eq('id', id).maybeSingle()
    if (!existing.data) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'already_moderated' }, { status: 409 })
  }

  const row = updateResult.data as unknown as StatusRow

  const auditResult = await supabase.from('admin_actions').insert({
    admin_id: admin.id,
    action: 'listing_approved',
    target_type: 'listing',
    target_id: id,
    meta: {},
  } as unknown as never)

  if (auditResult.error) {
    return NextResponse.json({ error: 'audit_write_failed' }, { status: 500 })
  }

  const response: ModerationActionResponse = { id: row.id, status: 'active' }
  return NextResponse.json(response)
}
