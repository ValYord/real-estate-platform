import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { notificationIdParamSchema, notificationPatchSchema } from '@/lib/notifications/schemas'

type Params = { id: string }
type RouteContext = { params: Promise<Params> }

interface NotificationOwnerRow {
  id: string
  user_id: string
}

/**
 * Looks a notification's owner up with the service-role client (bypasses
 * RLS) so the route can tell "not found" (404) apart from "belongs to
 * someone else" (403), per the doc's `PATCH` contract
 * (`403 { "error": "not_owner" }`). The RLS-scoped client alone can't make
 * that distinction — a cross-user SELECT is silently filtered to zero rows
 * by RLS, which would look identical to "doesn't exist".
 */
async function resolveOwner(
  id: string,
): Promise<{ ok: true; row: NotificationOwnerRow } | { ok: false; status: 404 | 500 }> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('notifications')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, status: 500 }
  if (!data) return { ok: false, status: 404 }
  return { ok: true, row: data as unknown as NotificationOwnerRow }
}

/**
 * PATCH /api/notifications/[id]
 *
 * Body: { read: boolean } — marks a single notification read/unread
 * (doc §3.4 "Mark read" / RowMenu "Mark unread").
 *
 * Auth: required (401). Ownership is checked explicitly (see resolveOwner
 * above) → 403 { error: "not_owner" } for a cross-user id, 404 for an id
 * that doesn't exist at all. The actual mutation goes through the
 * RLS-scoped client — an additional, authoritative enforcement layer beyond
 * the explicit check.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: Params
  try {
    resolvedParams = notificationIdParamSchema.parse(await params)
  } catch {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof notificationPatchSchema.parse>
  try {
    input = notificationPatchSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const ownership = await resolveOwner(resolvedParams.id)
  if (!ownership.ok) {
    return NextResponse.json(
      { error: ownership.status === 404 ? 'not_found' : 'server_error' },
      { status: ownership.status },
    )
  }
  if (ownership.row.user_id !== user.id) {
    return NextResponse.json({ error: 'not_owner' }, { status: 403 })
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: input.read } as unknown as never)
    .eq('id', resolvedParams.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/notifications/[id]
 *
 * Deletes a single notification (doc §3.4 RowMenu "Delete").
 * Auth/ownership rules mirror PATCH above. Returns 200 { deleted: true }.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  let resolvedParams: Params
  try {
    resolvedParams = notificationIdParamSchema.parse(await params)
  } catch {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const ownership = await resolveOwner(resolvedParams.id)
  if (!ownership.ok) {
    return NextResponse.json(
      { error: ownership.status === 404 ? 'not_found' : 'server_error' },
      { status: ownership.status },
    )
  }
  if (ownership.row.user_id !== user.id) {
    return NextResponse.json({ error: 'not_owner' }, { status: 403 })
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', resolvedParams.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
