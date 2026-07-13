import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { notificationPrefsPatchSchema } from '@/lib/settings/schemas'
import { mergeNotificationPrefs } from '@/lib/settings/mergePrefs'
import type { NotificationPrefs } from '@/lib/settings/types'

/**
 * PATCH /api/users/me/notification-prefs
 * Instant-save endpoint for the Notifications tab (§3.5). Accepts a deep
 * partial patch (master toggles and/or per-event-type channel toggles) and
 * merges it into the existing `notification_prefs` JSONB column.
 *
 * Body examples:
 *   { "emailEnabled": false }
 *   { "types": { "message": { "push": false } } }
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

  const parsed = notificationPrefsPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation' }, { status: 422 })
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', user.id)
    .single()

  const merged = mergeNotificationPrefs(
    (existing as { notification_prefs: NotificationPrefs | null } | null)?.notification_prefs,
    parsed.data,
  )

  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: merged, updated_at: new Date().toISOString() } as unknown as never)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, notificationPrefs: merged })
}
