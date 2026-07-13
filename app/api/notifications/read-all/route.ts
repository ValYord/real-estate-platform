import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import type { ReadAllResponse } from '@/lib/notifications/types'

/**
 * PATCH /api/notifications/read-all
 *
 * Marks every unread notification belonging to the caller as read.
 * Auth: required (401). RLS scopes the update to the caller's own rows;
 * the explicit `.eq('user_id', ...)` below is defense in depth.
 * Returns 200 { updated: <count> }.
 */
export async function PATCH(): Promise<NextResponse> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true } as unknown as never)
    .eq('user_id', user.id)
    .eq('is_read', false)
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const response: ReadAllResponse = { updated: (data ?? []).length }
  return NextResponse.json(response)
}
