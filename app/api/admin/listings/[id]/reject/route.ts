import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdmin } from '@/lib/admin/guard'
import { rejectSchema } from '@/lib/admin/schemas'
import type { ModerationActionResponse } from '@/lib/admin/types'

type RouteContext = { params: Promise<{ id: string }> }
type StatusRow = { id: string; status: string }

/**
 * POST /api/admin/listings/[id]/reject
 *
 * Body validated with rejectSchema (required `reason` enum + optional
 * `note`, per docs/en/pages/24-admin.md §5). Sets status=rejected.
 * Idempotent via the same conditional-update pattern as the approve route
 * (see its comment): 404 if the listing doesn't exist, 409
 * `already_moderated` if it exists but is no longer 'pending'.
 *
 * Every successful rejection writes an admin_actions audit row with the
 * reason/note in `meta`.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { id } = await params
  const guard = await requireAdmin()
  if (!guard) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const { supabase, admin } = guard

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof rejectSchema.parse>
  try {
    input = rejectSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'reason_required', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const updateResult = await supabase
    .from('properties')
    .update({ status: 'rejected', updated_at: new Date().toISOString() } as unknown as never)
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
    action: 'listing_rejected',
    target_type: 'listing',
    target_id: id,
    meta: { reason: input.reason, note: input.note ?? null },
  } as unknown as never)

  if (auditResult.error) {
    return NextResponse.json({ error: 'audit_write_failed' }, { status: 500 })
  }

  const response: ModerationActionResponse = { id: row.id, status: 'rejected' }
  return NextResponse.json(response)
}
